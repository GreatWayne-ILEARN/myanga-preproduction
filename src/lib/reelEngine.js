/**
 * Reel assembly + multi-channel dispatch.
 *
 * Channels:
 * - inapp: always written to member inbox (primary, works offline in Testing)
 * - email: Testing logs outbound; Production calls send-reel edge (Resend)
 * - webpush: uses PushSubscription if present; Testing shows local Notification
 * - whatsapp: queues job + deep-links to in-app reel (no BSP). Cloud API optional later.
 */
import { Data, isProduction, isTesting } from "./dataBridge.js";
import { hasSupabase, supabase } from "./supabase.js";
import {
  loadReelPrefs,
  saveReelPrefs,
  pushReelToInbox,
  logOutbound,
  enqueueWhatsApp,
  loadReelConfigOverride,
} from "./reelStore.js";

export async function getEffectiveReelConfig() {
  const live = (await Data.reelConfig()) || {};
  const override = loadReelConfigOverride();
  return { ...live, ...(override || {}) };
}

/** Build one curated reel from catalogue + brand placements. */
export async function assembleReel({ title } = {}) {
  const cfg = await getEffectiveReelConfig();
  const n = Math.min(30, Math.max(1, Number(cfg.images_per_reel) || 10));
  const maxAds = Math.min(15, Math.max(0, Number(cfg.max_brand_slots_per_reel) || 3));

  const garments = ((await Data.garments()) || [])
    .filter((g) => g.part === "main_outfit" || !g.part)
    .slice(0, n * 2);
  const placements = ((await Data.brandPlacements()) || []).filter((p) => p.is_active !== false);

  const panes = [];
  let gi = 0;
  let bi = 0;
  while (panes.length < n && (gi < garments.length || bi < placements.length)) {
    if (gi < garments.length) {
      const g = garments[gi++];
      panes.push({
        kind: "garment",
        id: g.id,
        title: g.name,
        subtitle: g.creator?.name || g.style,
        image: g.image || g.card_image,
        price_ngn: g.price_ngn,
        cta: "virtualwear",
      });
    }
    if (bi < Math.min(maxAds, placements.length) && panes.length < n && panes.length % 4 === 3) {
      const p = placements[bi++ % placements.length];
      panes.push({
        kind: "brand",
        id: p.id,
        title: p.brand || "Featured brand",
        subtitle: p.caption || "Sponsored",
        image: p.image_url,
        link: p.link_url,
        cta: "brand",
      });
    }
  }

  return {
    id: `reel_${Date.now().toString(36)}`,
    title: title || `MyYanga Reel · ${new Date().toLocaleDateString()}`,
    created_at: new Date().toISOString(),
    delivery_mode: cfg.delivery_mode || "inapp",
    panes,
    read: false,
  };
}

async function deliverInApp(reel) {
  pushReelToInbox(reel);
  logOutbound({ channel: "inapp", reel_id: reel.id, status: "delivered", detail: "Saved to Reels inbox" });
  return { channel: "inapp", ok: true };
}

async function deliverEmail(reel, prefs) {
  const to = prefs.email;
  if (!to) {
    logOutbound({ channel: "email", reel_id: reel.id, status: "skipped", detail: "No email on file" });
    return { channel: "email", ok: false, reason: "no_email" };
  }

  if (isTesting() || !hasSupabase || !isProduction()) {
    logOutbound({
      channel: "email",
      reel_id: reel.id,
      status: "queued_test",
      detail: `Testing — would email ${to} (${reel.panes.length} panes)`,
      to,
    });
    return { channel: "email", ok: true, mode: "test_log" };
  }

  try {
    const { data: sess } = await supabase.auth.getSession();
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/send-reel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ channel: "email", to, reel }),
    });
    const d = await r.json().catch(() => ({}));
    // Fail-soft: missing RESEND_API_KEY returns 501 + fallback — inbox already has the reel.
    if (!r.ok && (r.status === 501 || d.fallback)) {
      logOutbound({
        channel: "email",
        reel_id: reel.id,
        status: "skipped_no_key",
        detail: d.error || "RESEND_API_KEY not configured — in-app reel still delivered",
        to,
      });
      return { channel: "email", ok: false, soft: true, reason: "resend_missing", detail: d };
    }
    logOutbound({
      channel: "email",
      reel_id: reel.id,
      status: r.ok ? "sent" : "failed",
      detail: d.error || d.id || r.status,
      to,
    });
    return { channel: "email", ok: r.ok, detail: d };
  } catch (e) {
    logOutbound({ channel: "email", reel_id: reel.id, status: "failed", detail: e.message, to });
    return { channel: "email", ok: false, reason: e.message };
  }
}

async function deliverWebPush(reel, prefs) {
  const sub = prefs.pushSubscription;
  if (!sub) {
    logOutbound({ channel: "webpush", reel_id: reel.id, status: "skipped", detail: "Not subscribed to push" });
    return { channel: "webpush", ok: false, reason: "no_subscription" };
  }

  // Local preview notification (works without a push server in Testing)
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(reel.title, {
        body: `${reel.panes.length} looks ready — open MyYanga Reels`,
        icon: "/logo.svg",
        data: { url: "/?view=reels" },
      });
      logOutbound({ channel: "webpush", reel_id: reel.id, status: "local_notify", detail: "Browser Notification shown" });
      return { channel: "webpush", ok: true, mode: "local" };
    } catch (e) {
      logOutbound({ channel: "webpush", reel_id: reel.id, status: "failed", detail: e.message });
    }
  }

  if (isProduction() && hasSupabase) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/send-reel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ channel: "webpush", subscription: sub, reel }),
      });
      const d = await r.json().catch(() => ({}));
      logOutbound({ channel: "webpush", reel_id: reel.id, status: r.ok ? "sent" : "failed", detail: d.error || r.status });
      return { channel: "webpush", ok: r.ok };
    } catch (e) {
      logOutbound({ channel: "webpush", reel_id: reel.id, status: "failed", detail: e.message });
      return { channel: "webpush", ok: false };
    }
  }

  logOutbound({ channel: "webpush", reel_id: reel.id, status: "queued_test", detail: "Subscription saved; server push needs VAPID" });
  return { channel: "webpush", ok: true, mode: "test" };
}

async function deliverWhatsApp(reel, prefs) {
  const phone = String(prefs.phone || "").replace(/\s+/g, "");
  if (!phone) {
    logOutbound({ channel: "whatsapp", reel_id: reel.id, status: "skipped", detail: "No phone on file" });
    return { channel: "whatsapp", ok: false, reason: "no_phone" };
  }

  // Deep link into the in-app reel (works without BSP / Cloud API)
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.myyanga.com";
  const reelUrl = `${origin}/?view=reels&reel=${encodeURIComponent(reel.id)}`;
  const text = encodeURIComponent(`Your MyYanga reel is ready: ${reel.title}\n${reelUrl}`);
  const waMe = `https://wa.me/${phone.replace(/^\+/, "")}?text=${text}`;

  const job = enqueueWhatsApp({
    phone,
    reel_id: reel.id,
    title: reel.title,
    reelUrl,
    waMe,
    note: "Queued. Without Meta Cloud API, open wa.me link or send manually from a dedicated Business phone.",
  });

  logOutbound({
    channel: "whatsapp",
    reel_id: reel.id,
    status: "queued",
    detail: `Queued for ${phone} — deep link ready (no BSP)`,
    to: phone,
    waMe,
    job_id: job.id,
  });

  // Optional: Cloud API if env configured on edge
  if (isProduction() && hasSupabase) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/send-reel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ channel: "whatsapp", to: phone, reel, reelUrl }),
      });
    } catch {
      /* queue remains source of truth */
    }
  }

  return { channel: "whatsapp", ok: true, mode: "queue_deeplink", waMe, job };
}

/**
 * Dispatch a reel on every channel the member enabled.
 * Always delivers in-app when that channel is on (default).
 */
export async function dispatchReel(reel, { forceChannels } = {}) {
  const prefs = loadReelPrefs();
  const channels = forceChannels || prefs.channels || {};
  const results = [];

  if (channels.inapp !== false) results.push(await deliverInApp(reel));
  if (channels.email) results.push(await deliverEmail(reel, prefs));
  if (channels.webpush) results.push(await deliverWebPush(reel, prefs));
  if (channels.whatsapp) results.push(await deliverWhatsApp(reel, prefs));

  return { reel, results };
}

/** Admin / cron entry: assemble + dispatch. */
export async function sendReelNow(opts = {}) {
  const reel = await assembleReel(opts);
  return dispatchReel(reel, opts);
}

/** Register service worker for web push. */
export async function registerReelServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export async function subscribeWebPush() {
  if (typeof Notification === "undefined") throw new Error("Notifications not supported");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notification permission denied");

  await registerReelServiceWorker();
  const reg = await navigator.serviceWorker.ready;

  // Without VAPID server keys we still store a stub subscription marker for Testing
  let subscription = null;
  try {
    const cfg = await getEffectiveReelConfig();
    if (cfg.vapid_public_key && reg.pushManager) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.vapid_public_key),
      });
      subscription = subscription.toJSON();
    }
  } catch {
    subscription = { endpoint: `local://${Date.now()}`, keys: {}, local: true };
  }
  if (!subscription) subscription = { endpoint: `local://${Date.now()}`, keys: {}, local: true };

  saveReelPrefs({
    channels: { ...loadReelPrefs().channels, webpush: true },
    pushSubscription: subscription,
  });
  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
