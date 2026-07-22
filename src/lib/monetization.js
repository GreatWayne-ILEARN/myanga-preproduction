import { supabase, hasSupabase } from "./supabase.js";
import { isTesting } from "./dataBridge.js";

const FN = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") + "/functions/v1";

async function authHeaders() {
  if (!supabase) throw new Error("Not configured");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sign in required");
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/** Check if user can access a feature. Returns gate object with `access` boolean. */
export async function getFeatureGate(feature) {
  // Testing mode: unlock everything so QA can exercise flows without payments.
  if (isTesting() || !hasSupabase) return { feature, enabled: true, mode: "free", access: true };
  const { data, error } = await supabase.rpc("get_feature_gate", { p_feature: feature });
  if (error) throw new Error(error.message);
  return data;
}

/** Start checkout for a paid feature. Redirects browser on success. */
export async function checkoutFeature(feature) {
  const headers = await authHeaders();
  const r = await fetch(`${FN}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "init", feature }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Checkout failed");
  if (d.access || d.mode === "free") return { ok: true, free: true };
  if (d.authorizationUrl) {
    window.location.href = d.authorizationUrl;
    return { ok: true, redirecting: true };
  }
  throw new Error("No payment URL");
}

/** Verify payment after redirect (?payment=verify&ref=...) */
export async function verifyPaymentReturn(reference) {
  const headers = await authHeaders();
  const r = await fetch(`${FN}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "verify", reference }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Verification failed");
  return d;
}

/** Admin: list + update monetization settings */
export async function listMonetizationSettings() {
  if (isTesting() || !hasSupabase) return [];
  const { data, error } = await supabase.from("monetization_settings").select("*").order("feature");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveMonetizationSetting(patch) {
  if (isTesting() || !hasSupabase) throw new Error("Switch to Production mode to save monetization");
  const { error } = await supabase.from("monetization_settings").upsert({
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Handle ?payment=verify&ref= on app load */
export function consumePaymentReturn() {
  const u = new URL(window.location.href);
  if (u.searchParams.get("payment") !== "verify") return null;
  const ref = u.searchParams.get("ref");
  u.searchParams.delete("payment");
  u.searchParams.delete("ref");
  window.history.replaceState({}, "", u.pathname + u.search);
  return ref;
}
