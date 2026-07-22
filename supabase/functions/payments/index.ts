// MyYanga payments — feature gates + retail marketplace trust checkout.
// Feature unlocks: Flutterwave → Paystack → Stripe.
// Retail: Flutterwave/Paystack settle to e-vetted brand subaccounts with commission split at gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function userFromReq(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

function ref() {
  return `my_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

async function initFlutterwave(
  email: string,
  amount: number,
  reference: string,
  meta: Record<string, unknown>,
  subaccounts?: Array<{ id: string; transaction_charge_type: string; transaction_charge: number }>,
) {
  const key = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!key) return null;
  const payload: Record<string, unknown> = {
    tx_ref: reference,
    amount,
    currency: "NGN",
    redirect_url: `${Deno.env.get("PUBLIC_APP_URL")}/?payment=verify&ref=${reference}`,
    customer: { email },
    meta,
    customizations: {
      title: "MyYanga",
      description: meta.kind === "retail" ? "Designer purchase (trust checkout)" : String(meta.feature || "MyYanga"),
    },
  };
  if (subaccounts?.length) payload.subaccounts = subaccounts;
  const r = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await r.json();
  if (d.status !== "success") throw new Error(d.message || "Flutterwave init failed");
  return { provider: "flutterwave", authorizationUrl: d.data.link as string };
}

async function initPaystack(email: string, amount: number, reference: string, meta: Record<string, unknown>) {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) return null;
  const r = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      reference,
      callback_url: `${Deno.env.get("PUBLIC_APP_URL")}/?payment=verify&ref=${reference}`,
      metadata: meta,
    }),
  });
  const d = await r.json();
  if (!d.status) throw new Error(d.message || "Paystack init failed");
  return { provider: "paystack", authorizationUrl: d.data.authorization_url as string };
}

/** Single-brand retail: Paystack subaccount + transaction_charge (kobo) to main (commission). */
async function initPaystackRetail(
  email: string,
  amount: number,
  reference: string,
  meta: Record<string, unknown>,
  subaccount: string,
  commissionNgn: number,
) {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) return null;
  const r = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      reference,
      callback_url: `${Deno.env.get("PUBLIC_APP_URL")}/?payment=verify&ref=${reference}`,
      metadata: meta,
      subaccount,
      transaction_charge: Math.max(0, commissionNgn) * 100,
      bearer: "account",
    }),
  });
  const d = await r.json();
  if (!d.status) throw new Error(d.message || "Paystack retail init failed");
  return { provider: "paystack", authorizationUrl: d.data.authorization_url as string };
}

async function initStripe(email: string, amount: number, reference: string, meta: Record<string, unknown>) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${Deno.env.get("PUBLIC_APP_URL")}/?payment=verify&ref=${reference}`,
    cancel_url: `${Deno.env.get("PUBLIC_APP_URL")}/?payment=cancel`,
    "line_items[0][price_data][currency]": "ngn",
    "line_items[0][price_data][product_data][name]": String(meta.feature || "MyYanga"),
    "line_items[0][price_data][unit_amount]": String(amount * 100),
    "line_items[0][quantity]": "1",
    customer_email: email,
    client_reference_id: reference,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || "Stripe init failed");
  return { provider: "stripe", authorizationUrl: d.url as string };
}

async function verifyProvider(provider: string, reference: string) {
  if (provider === "flutterwave") {
    const key = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const d = await r.json();
    return d.data?.status === "successful";
  }
  if (provider === "paystack") {
    const key = Deno.env.get("PAYSTACK_SECRET_KEY");
    const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const d = await r.json();
    return d.data?.status === "success";
  }
  if (provider === "stripe") {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions?client_reference_id=${reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const d = await r.json();
    return d.data?.[0]?.payment_status === "paid";
  }
  return false;
}

async function logWebhook(provider: string, eventId: string, reference: string | null, payload: unknown) {
  const { error } = await admin().from("payment_webhook_events").insert({
    provider,
    event_id: eventId,
    reference,
    payload: payload as Record<string, unknown>,
  });
  if (error?.code === "23505") return false;
  return true;
}

async function fulfillByReference(reference: string) {
  const { data: pay } = await admin().from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!pay) return;
  if (pay.feature === "retail_checkout") {
    await admin().from("payments").update({ status: "succeeded", updated_at: new Date().toISOString() }).eq("reference", reference);
    await admin().rpc("mark_retail_order_paid", { p_reference: reference });
    return;
  }
  await admin().rpc("fulfill_payment", { p_reference: reference });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  if (path === "webhook") {
    const provider = url.searchParams.get("provider") || "paystack";
    const raw = await req.text();
    const eventId = `${provider}_${Date.now()}_${raw.slice(0, 24)}`;
    let reference: string | null = null;
    try {
      const parsed = JSON.parse(raw);
      reference = parsed?.data?.reference || parsed?.data?.tx_ref || parsed?.data?.client_reference_id || null;
      const fresh = await logWebhook(provider, eventId, reference, parsed);
      if (!fresh) return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: cors });
      if (reference) await fulfillByReference(reference);
    } catch {
      return new Response(JSON.stringify({ error: "bad payload" }), { status: 400, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  }

  const user = await userFromReq(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const body = await req.json().catch(() => ({}));
  const { action, feature, reference: verifyRef } = body;

  if (action === "verify" && verifyRef) {
    const { data: pay } = await admin().from("payments").select("*").eq("reference", verifyRef).eq("user_id", user.id).single();
    if (!pay) return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: cors });
    if (pay.status === "succeeded") {
      if (pay.feature === "retail_checkout") await admin().rpc("mark_retail_order_paid", { p_reference: verifyRef });
      return new Response(JSON.stringify({ ok: true, feature: pay.feature }), { headers: cors });
    }
    const ok = await verifyProvider(pay.provider, verifyRef);
    if (!ok) return new Response(JSON.stringify({ error: "Not successful" }), { status: 402, headers: cors });
    await fulfillByReference(verifyRef);
    return new Response(JSON.stringify({ ok: true, feature: pay.feature }), { headers: cors });
  }

  if (action === "retail_init") {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return new Response(JSON.stringify({ error: "Empty bag" }), { status: 400, headers: cors });

    const { data: commerce } = await admin().from("commerce_settings").select("*").eq("id", 1).maybeSingle();
    const commissionPct = Number(body.commission_pct ?? commerce?.commission_pct ?? 8);
    const providerOrder = (commerce?.provider_order as string[]) || ["flutterwave", "paystack"];

    const creatorIds = [...new Set(items.map((i: { creator_id: number }) => i.creator_id))];
    const { data: creators, error: cErr } = await admin().from("creators").select("*").in("id", creatorIds);
    if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500, headers: cors });
    const byId = new Map((creators || []).map((c: { id: number }) => [c.id, c]));

    for (const id of creatorIds) {
      const c = byId.get(id) as { is_e_vetted?: boolean; name?: string };
      if (!c?.is_e_vetted) {
        return new Response(JSON.stringify({ error: `${c?.name || "Brand"} is not e-vetted — cart unavailable` }), {
          status: 403,
          headers: cors,
        });
      }
    }

    const subtotal = items.reduce(
      (s: number, i: { unit_price_ngn: number; qty: number }) => s + Number(i.unit_price_ngn) * Number(i.qty || 1),
      0,
    );
    if (subtotal < 1) return new Response(JSON.stringify({ error: "Invalid total" }), { status: 400, headers: cors });

    const commissionNgn = Math.round((subtotal * commissionPct) / 100);
    const brandNet = subtotal - commissionNgn;
    const reference = String(body.reference || `rt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`);

    const groups = new Map<number, { subtotal: number; fw?: string; ps?: string; name?: string }>();
    for (const it of items as Array<{ creator_id: number; unit_price_ngn: number; qty: number; brand_name?: string }>) {
      const c = byId.get(it.creator_id) as {
        flutterwave_subaccount_id?: string;
        paystack_subaccount_code?: string;
        name?: string;
      };
      const g = groups.get(it.creator_id) || {
        subtotal: 0,
        fw: c?.flutterwave_subaccount_id,
        ps: c?.paystack_subaccount_code,
        name: c?.name || it.brand_name,
      };
      g.subtotal += Number(it.unit_price_ngn) * Number(it.qty || 1);
      groups.set(it.creator_id, g);
    }

    const fwSubs = [...groups.values()]
      .filter((g) => g.fw)
      .map((g) => ({
        id: g.fw as string,
        transaction_charge_type: "flat_subaccount",
        transaction_charge: Math.round(g.subtotal * (1 - commissionPct / 100)),
      }));

    await admin().from("retail_orders").insert({
      reference,
      user_id: user.id,
      buyer_email: body.email || user.email,
      buyer_phone: body.phone || null,
      status: "awaiting_payment",
      subtotal_ngn: subtotal,
      commission_pct: commissionPct,
      commission_ngn: commissionNgn,
      brand_net_ngn: brandNet,
      shipping: body.shipping || {},
      trust_note:
        commerce?.trust_copy ||
        "Trust checkout — gateway settles to e-vetted designer with MyYanga commission split.",
      metadata: { groups: [...groups.entries()].map(([id, g]) => ({ creator_id: id, ...g })) },
    });

    const { data: orderRow } = await admin().from("retail_orders").select("id").eq("reference", reference).single();
    if (orderRow?.id) {
      await admin().from("retail_order_items").insert(
        (items as Array<Record<string, unknown>>).map((it) => {
          const c = byId.get(it.creator_id as number) as {
            flutterwave_subaccount_id?: string;
            paystack_subaccount_code?: string;
            name?: string;
          };
          const qty = Number(it.qty || 1);
          const unit = Number(it.unit_price_ngn || 0);
          return {
            order_id: orderRow.id,
            creator_id: it.creator_id,
            garment_id: it.garment_id,
            name: it.name,
            brand_name: c?.name || it.brand_name,
            size: it.size,
            colour: it.colour,
            qty,
            unit_price_ngn: unit,
            line_total_ngn: unit * qty,
            flutterwave_subaccount_id: c?.flutterwave_subaccount_id || null,
            paystack_subaccount_code: c?.paystack_subaccount_code || null,
          };
        }),
      );
    }

    const meta = { kind: "retail", feature: "retail_checkout", user_id: user.id, reference };
    await admin().from("payments").insert({
      user_id: user.id,
      feature: "retail_checkout",
      provider: "flutterwave",
      reference,
      amount_ngn: subtotal,
      status: "pending",
      metadata: meta,
    });

    let result: { provider: string; authorizationUrl: string } | null = null;
    for (const p of providerOrder) {
      try {
        if (p === "flutterwave") {
          if (!fwSubs.length) throw new Error("No Flutterwave subaccounts on e-vetted brands");
          result = await initFlutterwave(body.email || user.email!, subtotal, reference, meta, fwSubs);
        }
        if (p === "paystack" && groups.size === 1) {
          const only = [...groups.values()][0];
          if (!only.ps) throw new Error("No Paystack subaccount");
          result = await initPaystackRetail(
            body.email || user.email!,
            subtotal,
            reference,
            meta,
            only.ps,
            commissionNgn,
          );
        }
        if (result) {
          await admin().from("payments").update({ provider: result.provider }).eq("reference", reference);
          await admin().from("retail_orders").update({ provider: result.provider }).eq("reference", reference);
          break;
        }
      } catch {
        /* next */
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({
          error:
            "No settlement provider ready. Attach Flutterwave subaccount IDs on e-vetted brands (required for multi-brand bags).",
        }),
        { status: 503, headers: cors },
      );
    }

    return new Response(
      JSON.stringify({ ...result, reference, amount_ngn: subtotal, commission_ngn: commissionNgn }),
      { headers: cors },
    );
  }

  if (action !== "init" || !feature) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: cors });
  }

  const { data: gate } = await admin().rpc("get_feature_gate", { p_feature: feature });
  if (!gate?.enabled) return new Response(JSON.stringify({ error: "Feature disabled" }), { status: 403, headers: cors });
  if (gate.mode === "free") return new Response(JSON.stringify({ access: true, mode: "free" }), { headers: cors });

  const amount = Number(gate.price_ngn);
  if (!amount || amount < 1) return new Response(JSON.stringify({ error: "Price not set" }), { status: 400, headers: cors });

  const reference = ref();
  const order = (gate.provider_order as string[]) || ["flutterwave", "paystack", "stripe"];
  const meta = { feature, user_id: user.id };

  await admin().from("payments").insert({
    user_id: user.id,
    feature,
    provider: "flutterwave",
    reference,
    amount_ngn: amount,
    status: "pending",
    metadata: meta,
  });

  let result: { provider: string; authorizationUrl: string } | null = null;
  for (const p of order) {
    try {
      if (p === "flutterwave") result = await initFlutterwave(user.email!, amount, reference, meta);
      if (p === "paystack") result = await initPaystack(user.email!, amount, reference, meta);
      if (p === "stripe") result = await initStripe(user.email!, amount, reference, meta);
      if (result) {
        await admin().from("payments").update({ provider: result.provider }).eq("reference", reference);
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!result) {
    return new Response(JSON.stringify({ error: "No payment provider configured" }), { status: 503, headers: cors });
  }

  return new Response(JSON.stringify({ ...result, reference, amount_ngn: amount }), { headers: cors });
});
