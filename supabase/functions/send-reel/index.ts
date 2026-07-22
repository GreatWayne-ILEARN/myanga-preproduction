// send-reel — channel dispatch for email / webpush / whatsapp (Cloud API optional).
// Testing path is client-side; this function is for Production secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const { channel, to, reel, reelUrl, subscription } = body as {
    channel?: string;
    to?: string;
    reel?: { id?: string; title?: string; panes?: { title?: string }[] };
    reelUrl?: string;
    subscription?: { endpoint?: string };
  };

  if (channel === "email") {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ error: "RESEND_API_KEY not set", fallback: true }, 501);
    if (!to) return json({ error: "to required" }, 400);
    const html = `<h1>${reel?.title || "MyYanga Reel"}</h1><p>${reel?.panes?.length || 0} looks inside.</p><p><a href="${reelUrl || "https://www.myyanga.com"}">Open reel</a></p>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("REEL_EMAIL_FROM") || "MyYanga <reels@myyanga.com>",
        to: [to],
        subject: reel?.title || "Your MyYanga reel",
        html,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: d.message || "email failed", detail: d }, 502);
    return json({ ok: true, provider: "resend", id: d.id });
  }

  if (channel === "whatsapp") {
    const token = Deno.env.get("WHATSAPP_CLOUD_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneId) {
      return json({
        ok: false,
        queued: true,
        message: "No Cloud API credentials — use client wa.me queue / dedicated SIM manual send",
      }, 501);
    }
    if (!to) return json({ error: "to required" }, 400);
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: String(to).replace(/\D/g, ""),
        type: "text",
        text: { body: `${reel?.title || "MyYanga reel"}\n${reelUrl || ""}` },
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: "whatsapp failed", detail: d }, 502);
    return json({ ok: true, provider: "meta_cloud", id: d.messages?.[0]?.id });
  }

  if (channel === "webpush") {
    // Full web-push signing needs a Deno-compatible web-push lib + VAPID private key.
    // Acknowledge subscription for now; client also shows local Notification in Testing.
    if (!subscription?.endpoint) return json({ error: "subscription required" }, 400);
    return json({
      ok: true,
      queued: true,
      message: "Subscription accepted — wire web-push library with VAPID_PRIVATE_KEY for server fan-out",
      endpoint: subscription.endpoint,
    });
  }

  return json({ error: "Unknown channel" }, 400);
});
