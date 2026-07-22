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

  const key = Deno.env.get("OPENAI_API_KEY");
  const { prompt } = await req.json().catch(() => ({ prompt: "" }));
  if (!key) return Response.json({ text: "AI unavailable (set OPENAI_API_KEY)." }, { headers: cors });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt || "Summarise platform analytics." }],
    }),
  });
  const d = await r.json();
  return Response.json({ text: d?.choices?.[0]?.message?.content || "No summary." }, { headers: cors });
});
