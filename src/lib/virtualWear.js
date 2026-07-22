/**
 * Virtual wear rendering.
 * Preferred path: AI try-on edge function (photorealistic, Gemini image editing via GOOGLE_API_KEY).
 * Fallback path: on-device canvas compositing (photo never leaves the device).
 *
 * AWS / platform notes:
 * - Set edge secret GOOGLE_API_KEY (Gemini). Without it, virtual-tryon returns 501 { fallback: true }
 *   and the client always soft-fails to compositeLook — UX stays usable.
 * - AI path requires Production mode + signed-in user + feature gate virtual_wear.
 */
import { supabase, hasSupabase } from "./supabase.js";
import { isProduction } from "./dataBridge.js";

const SCENES = {
  plain: null,
  wedding: { c1: "#f5ebe0", c2: "#d4a574", label: "Wedding" },
  corporate: { c1: "#e8eaed", c2: "#5f6368", label: "Corporate" },
  festival: { c1: "#850713", c2: "#B8893A", label: "Owambe / Festival" },
  traditional: { c1: "#850713", c2: "#C9A227", label: "Traditional" },
  date: { c1: "#2E5E4E", c2: "#16302a", label: "Date / Evening" },
  casual: { c1: "#4a5568", c2: "#cbd5e0", label: "Casual" },
};

export function sceneOptions() {
  return Object.entries(SCENES).map(([k, v]) => ({ id: k, label: v?.label || "Plain background" }));
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

const FN = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") + "/functions/v1";

/**
 * Photorealistic AI try-on via the virtual-tryon edge function.
 * Throws with { fallback: true } when the server wants the client to
 * fall back to canvas compositing (no key configured, model error).
 */
export async function aiTryOn({ photoDataUrl, garments, scene = "plain" }) {
  if (!hasSupabase || !isProduction()) {
    const e = new Error("AI try-on needs Production mode");
    e.fallback = true;
    throw e;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const e = new Error("Sign in required for AI try-on");
    e.fallback = true;
    throw e;
  }
  const r = await fetch(`${FN}/virtual-tryon`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      personImage: photoDataUrl,
      garments: garments.map((g) => ({ name: g.name, image: g.image || g.card_image || null })),
      scene,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 402) {
    const e = new Error("Payment required for virtual wear");
    e.paymentRequired = true;
    throw e;
  }
  if (!r.ok || !d.image) {
    const e = new Error(d.error || "AI try-on failed");
    e.fallback = d.fallback !== false;
    throw e;
  }
  return { image: d.image, provider: d.provider };
}

/**
 * Render a look: AI try-on first, canvas compositing as fallback.
 * Returns { image, mode: "ai" | "canvas" }.
 */
export async function renderLook({ photoDataUrl, garments, scene = "plain" }) {
  try {
    const out = await aiTryOn({ photoDataUrl, garments, scene });
    return { image: out.image, mode: "ai" };
  } catch (e) {
    if (e.paymentRequired) throw e;
    const image = await compositeLook({ photoDataUrl, garments, scene });
    return { image, mode: "canvas" };
  }
}

/** Composite user photo + garment overlays + optional scene tint. */
export async function compositeLook({ photoDataUrl, garments, scene = "plain" }) {
  const photo = await loadImg(photoDataUrl);
  const w = Math.min(900, photo.naturalWidth);
  const h = Math.round((photo.naturalHeight / photo.naturalWidth) * w);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // Scene background tint (subtle — photo stays visible)
  const sc = SCENES[scene];
  if (sc) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, sc.c1 + "40");
    g.addColorStop(1, sc.c2 + "30");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(photo, 0, 0, w, h);

  // Overlay garments (centered, scaled to torso region)
  const overlays = garments.filter((g) => g.image || g.card_image);
  for (let i = 0; i < overlays.length; i++) {
    const g = overlays[i];
    try {
      const img = await loadImg(g.image || g.card_image);
      const scale = 0.35 + i * 0.05;
      const gw = w * scale;
      const gh = (img.naturalHeight / img.naturalWidth) * gw;
      const gx = (w - gw) / 2;
      const gy = h * 0.22 + i * 12;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(img, gx, gy, gw, gh);
      ctx.globalAlpha = 1;
    } catch {
      // garment image missing — draw a labelled placeholder
      ctx.fillStyle = "rgba(133,7,19,0.15)";
      ctx.fillRect(w * 0.2, h * 0.25, w * 0.6, h * 0.45);
      ctx.fillStyle = "#850713";
      ctx.font = "bold 14px Raleway,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(g.name || "Garment", w / 2, h * 0.48);
    }
  }

  return c.toDataURL("image/jpeg", 0.88);
}

/** Build a look from selected garment rows */
export function buildLookDeck(garments, brief = {}) {
  const parts = ["head_piece", "main_outfit", "shoes", "jewellery", "bag"];
  const byPart = {};
  for (const p of parts) {
    const match = garments.find((g) => g.part === p) || garments.find((g) => g.part === "main_outfit");
    if (match && !byPart[p]) byPart[p] = match;
  }
  const items = Object.values(byPart);
  const total = items.reduce((s, g) => s + (g.price_ngn || 0), 0);
  const brand = items[0]?.creator?.name || items[0]?.creator || "MyYanga";
  return {
    name: `${brief.style || "Statement"} Look`,
    style: brief.style || "",
    scene: brief.scene || "plain",
    items,
    total_ngn: total,
    designer: brand,
  };
}

export async function shareLookNative(dataUrl, title = "My MyYanga look") {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], "myyanga-look.jpg", { type: "image/jpeg" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text: "What do you think of this look?", files: [file] });
    return true;
  }
  return false;
}
