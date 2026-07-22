// SmartSearch — multi-parameter garment search + optional AI narrative.
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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: gate } = await admin.rpc("get_feature_gate", { p_feature: "smart_search" });
  if (!gate?.access) {
    return new Response(JSON.stringify({ error: "Payment required", gate }), { status: 402, headers: cors });
  }

  const body = await req.json().catch(() => ({}));
  const {
    event,
    style,
    colour,
    gender,
    budgetMin,
    budgetMax,
    promotedOnly,
    query,
    limit = 12,
  } = body as Record<string, unknown>;

  let q = admin
    .from("garments")
    .select("*, creator:creators(id,name,credibility_score,is_promoted)")
    .eq("is_active", true);

  if (style) q = q.eq("style", style);
  if (gender) q = q.eq("gender", gender);
  if (colour) q = q.contains("colours", [colour]);
  if (event) q = q.contains("event_tags", [event]);
  if (budgetMin) q = q.gte("price_ngn", Number(budgetMin));
  if (budgetMax) q = q.lte("price_ngn", Number(budgetMax));
  if (promotedOnly) q = q.eq("is_premium", true);

  const { data: garments, error } = await q.limit(Math.min(Number(limit) || 12, 30));
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  let rows = garments ?? [];
  if (query && typeof query === "string") {
    const needle = query.toLowerCase();
    rows = rows.filter(
      (g) =>
        g.name?.toLowerCase().includes(needle) ||
        g.style?.toLowerCase().includes(needle) ||
        (g.creator as { name?: string })?.name?.toLowerCase().includes(needle),
    );
  }

  // Build look decks: group by style into 3-card looks
  const decks: { title: string; items: typeof rows; total_ngn: number }[] = [];
  const byStyle = new Map<string, typeof rows>();
  for (const g of rows) {
    const k = g.style || "Look";
    if (!byStyle.has(k)) byStyle.set(k, []);
    byStyle.get(k)!.push(g);
  }
  for (const [styleName, items] of byStyle) {
    if (items.length < 2) continue;
    const pick = items.slice(0, 4);
    decks.push({
      title: `${styleName} look`,
      items: pick,
      total_ngn: pick.reduce((s, x) => s + (x.price_ngn || 0), 0),
    });
    if (decks.length >= 6) break;
  }

  let summary = "";
  const aiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (aiKey && query) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": aiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are MyYanga fashion stylist. User wants: ${query}. Event: ${event || "any"}. Style: ${style || "any"}. Colour: ${colour || "any"}. Budget: ${budgetMin || 0}-${budgetMax || "open"} NGN. Found ${rows.length} garments in ${decks.length} look decks. Write 2 sentences of styling advice.`,
          },
        ],
      }),
    });
    const d = await r.json();
    summary = d?.content?.[0]?.text || "";
  }

  return new Response(JSON.stringify({ garments: rows, decks, summary, count: rows.length }), { headers: cors });
});
