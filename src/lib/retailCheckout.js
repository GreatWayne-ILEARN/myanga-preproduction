/**
 * Retail checkout client — trust platform settlement via payments edge.
 */
import { supabase, hasSupabase } from "./supabase.js";
import { isTesting } from "./dataBridge.js";
import { DEFAULT_COMMISSION_PCT, TRUST_COPY, groupCartByBrand, splitAmounts } from "./commerce.js";
import { clearBag, loadBag } from "./cartStore.js";

const FN = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") + "/functions/v1";
const LOCAL_ORDERS = "myyanga_retail_orders";

async function authHeaders() {
  if (!supabase) throw new Error("Not configured");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sign in to checkout");
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

function saveLocalOrder(order) {
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_ORDERS) || "[]");
    rows.unshift(order);
    localStorage.setItem(LOCAL_ORDERS, JSON.stringify(rows.slice(0, 40)));
  } catch {}
}

export function listLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ORDERS) || "[]");
  } catch {
    return [];
  }
}

/**
 * Start checkout for current bag.
 * Testing: mock immediate settlement (simulates Flutterwave split).
 * Production: payments edge → Flutterwave/Paystack with subaccount split.
 */
export async function checkoutBag({ email, phone, shipping = {} } = {}) {
  const bag = loadBag();
  if (!bag.items.length) throw new Error("Your bag is empty");

  const groups = groupCartByBrand(bag.items);
  for (const g of groups) {
    if (!g.creator_id) throw new Error("Missing brand on a bag item");
  }

  const subtotal = bag.items.reduce((s, i) => s + i.unit_price_ngn * i.qty, 0);
  const split = splitAmounts(subtotal, DEFAULT_COMMISSION_PCT);
  const reference = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const orderPayload = {
    reference,
    items: bag.items,
    groups,
    buyer_email: email,
    buyer_phone: phone,
    shipping,
    ...split,
    trust_note: TRUST_COPY,
    created_at: new Date().toISOString(),
  };

  if (isTesting() || !hasSupabase) {
    const settled = {
      ...orderPayload,
      status: "paid",
      provider: "flutterwave_mock_split",
      provider_refs: groups.map((g) => ({
        brand: g.brand_name,
        subtotal_ngn: g.subtotal_ngn,
        ...splitAmounts(g.subtotal_ngn),
        note: "Mock: brand subaccount credited; MyYanga commission split at gateway",
      })),
    };
    saveLocalOrder(settled);
    clearBag();
    return { ok: true, testing: true, order: settled, message: "Settled (Testing) — brand + commission split simulated" };
  }

  const headers = await authHeaders();
  const r = await fetch(`${FN}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "retail_init",
      reference,
      email,
      phone,
      shipping,
      items: bag.items,
      commission_pct: DEFAULT_COMMISSION_PCT,
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Checkout failed");

  if (d.authorizationUrl) {
    saveLocalOrder({ ...orderPayload, status: "awaiting_payment", provider: d.provider });
    window.location.href = d.authorizationUrl;
    return { ok: true, redirecting: true, reference: d.reference || reference };
  }
  throw new Error("No payment URL from gateway");
}
