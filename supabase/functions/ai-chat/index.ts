// AI assistant — authenticated; falls back gracefully without a key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization");
  if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const { prompt } = await req.json().catch(() => ({ prompt: "" }));
  if (!key) return Response.json({ text: "AI unavailable (set ANTHROPIC_API_KEY)." }, { headers: cors });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt || "Summarise platform analytics." }],
    }),
  });
  const d = await r.json();
  return Response.json({ text: d?.content?.[0]?.text || "No summary." }, { headers: cors });
});
