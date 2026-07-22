import { supabase } from "./supabase.js";

const FN = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") + "/functions/v1";

async function headers() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sign in required");
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/** Multi-parameter search — all filters sent in one request. */
export async function smartSearch(params) {
  const r = await fetch(`${FN}/smart-search`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(params),
  });
  const d = await r.json();
  if (r.status === 402) return { paymentRequired: true, gate: d.gate };
  if (!r.ok) throw new Error(d.error || "Search failed");
  return d;
}

/** Shuffle decks client-side */
export function shuffleDecks(decks) {
  const copy = [...decks];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
