// auth-whatsapp — secondary sign-in via WhatsApp OTP (Meta Cloud API, no BSP).
// request: send 6-digit code | verify: mint magiclink token_hash for client verifyOtp
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function normalizePhone(raw: string) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return `+${digits.slice(1).replace(/\D/g, "")}`;
  const only = digits.replace(/\D/g, "");
  if (only.length === 11 && only.startsWith("0")) return `+234${only.slice(1)}`;
  if (only.length === 10 && /^[789]/.test(only)) return `+234${only}`;
  if (only.length >= 10) return `+${only}`;
  return "";
}

function waEmail(phone: string) {
  return `wa_${normalizePhone(phone).replace(/\D/g, "")}@auth.myyanga.app`;
}

// In-memory OTP (edge isolate). For multi-instance production, move to a table.
const challenges = new Map<string, { code: string; expires: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const phone = normalizePhone(body.phone || "");
  if (!phone) return json({ error: "Valid phone required" }, 400);

  if (action === "request") {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    challenges.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 });

    const token = Deno.env.get("WHATSAPP_CLOUD_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneId) {
      return json({
        ok: true,
        queued: false,
        detail: "WhatsApp Cloud not configured — set WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_NUMBER_ID",
        // Dev escape hatch only when explicitly allowed
        code: Deno.env.get("WA_AUTH_EXPOSE_OTP") === "1" ? code : undefined,
      });
    }

    const to = phone.replace(/^\+/, "");
    const template = Deno.env.get("WHATSAPP_OTP_TEMPLATE"); // e.g. myyanga_auth_otp
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        template
          ? {
              messaging_product: "whatsapp",
              to,
              type: "template",
              template: {
                name: template,
                language: { code: Deno.env.get("WHATSAPP_OTP_LANG") || "en" },
                components: [
                  {
                    type: "body",
                    parameters: [{ type: "text", text: code }],
                  },
                  {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [{ type: "text", text: code }],
                  },
                ],
              },
            }
          : {
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: {
                body: `Your MyYanga sign-in code is ${code}. Valid for 10 minutes.`,
              },
            },
      ),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Keep challenge so ops can still use WA_AUTH_EXPOSE_OTP in staging
      return json({ error: "WhatsApp send failed", detail: d }, 502);
    }
    return json({ ok: true, sent: true });
  }

  if (action === "verify") {
    const code = String(body.code || "").trim();
    const ch = challenges.get(phone);
    if (!ch || ch.code !== code) return json({ error: "Invalid or expired code" }, 401);
    if (Date.now() > ch.expires) {
      challenges.delete(phone);
      return json({ error: "Code expired" }, 401);
    }
    challenges.delete(phone);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const email = waEmail(phone);

    // Ensure user exists (idempotent)
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { phone, auth_provider: "whatsapp", full_name: `WA ${phone.slice(-4)}` },
      });
      if (createErr && !/already/i.test(createErr.message)) {
        return json({ error: createErr.message }, 500);
      }
      const { data: userData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = userData?.users?.find((x) => x.email?.toLowerCase() === email);
      if (u) {
        await admin.from("profiles").upsert({
          id: u.id,
          email,
          name: `WA ${phone.slice(-4)}`,
        });
      }
    }

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr) return json({ error: linkErr.message }, 500);
    const token_hash = link?.properties?.hashed_token;
    if (!token_hash) return json({ error: "Could not mint session" }, 500);

    return json({ ok: true, email, token_hash, phone });
  }

  return json({ error: "Unknown action" }, 400);
});
