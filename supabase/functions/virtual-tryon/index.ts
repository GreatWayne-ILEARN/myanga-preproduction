// Virtual try-on — photorealistic AI compositing via Gemini image editing.
// Authenticated + feature-gated. Client falls back to on-device canvas
// compositing when this function is unavailable (no key / error).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function parseDataUrl(dataUrl: string): { mime: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  return m ? { mime: m[1], data: m[2] } : null;
}

async function fetchAsBase64(url: string): Promise<{ mime: string; data: string } | null> {
  const inline = parseDataUrl(url);
  if (inline) return inline;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    return { mime, data: btoa(bin) };
  } catch {
    return null;
  }
}

const SCENE_PROMPTS: Record<string, string> = {
  plain: "Keep the original background unchanged.",
  wedding: "Place the person in an elegant African wedding hall with warm gold-and-cream decor, soft drapery and celebratory lighting.",
  corporate: "Place the person in a modern corporate office lobby with clean neutral tones and daylight.",
  festival: "Place the person at a vibrant Nigerian owambe celebration with rich maroon and gold party decor.",
  traditional: "Place the person in a dignified traditional African courtyard setting with warm earth tones.",
  date: "Place the person in an upscale evening restaurant setting with soft warm lighting.",
  casual: "Place the person in a bright contemporary urban street setting with soft daylight.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: gate } = await admin.rpc("get_feature_gate", { p_feature: "virtual_wear" });
  if (!gate?.access) return json({ error: "Payment required", gate }, 402);

  const key = Deno.env.get("GOOGLE_API_KEY");
  if (!key) return json({ error: "AI try-on not configured", fallback: true }, 501);

  const body = await req.json().catch(() => ({}));
  const { personImage, garments = [], scene = "plain" } = body as {
    personImage?: string;
    garments?: { name?: string; image?: string }[];
    scene?: string;
  };
  if (!personImage) return json({ error: "personImage required" }, 400);

  const person = parseDataUrl(personImage);
  if (!person) return json({ error: "personImage must be a base64 data URL" }, 400);
  if (person.data.length > 8_000_000) return json({ error: "Photo too large — max ~6MB" }, 413);

  // Gather garment reference images (max 4)
  const parts: unknown[] = [{ inline_data: { mime_type: person.mime, data: person.data } }];
  const named: string[] = [];
  for (const g of (garments as { name?: string; image?: string }[]).slice(0, 4)) {
    if (!g.image) {
      if (g.name) named.push(g.name);
      continue;
    }
    const img = await fetchAsBase64(g.image);
    if (img) {
      parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
      if (g.name) named.push(g.name);
    } else if (g.name) {
      named.push(g.name);
    }
  }

  const prompt =
    `The first image is a person. The following images are African fashion garments` +
    (named.length ? ` (${named.join(", ")})` : "") +
    `. Generate a photorealistic image of this exact person wearing these garments as a complete styled outfit. ` +
    `Preserve the person's face, skin tone, body shape and pose faithfully. ` +
    `Fit the garments naturally with realistic draping, fabric texture and lighting. ` +
    (SCENE_PROMPTS[scene] || SCENE_PROMPTS.plain) +
    ` High-end fashion editorial quality.`;
  parts.push({ text: prompt });

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return json({ error: "AI try-on failed", detail: detail.slice(0, 400), fallback: true }, 502);
  }

  const d = await r.json();
  const out = d?.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p.inlineData?.data || p.inline_data?.data,
  );
  const b64 = out?.inlineData?.data || out?.inline_data?.data;
  if (!b64) return json({ error: "Model returned no image", fallback: true }, 502);

  const mime = out?.inlineData?.mimeType || out?.inline_data?.mime_type || "image/png";
  return json({ image: `data:${mime};base64,${b64}`, provider: "gemini-2.5-flash-image", scene });
});
