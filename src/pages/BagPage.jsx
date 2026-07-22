import React, { useEffect, useState } from "react";
import { loadBag, updateQty, removeFromBag, bagSubtotal } from "../lib/cartStore.js";
import { checkoutBag } from "../lib/retailCheckout.js";
import { DEFAULT_COMMISSION_PCT, TRUST_COPY, groupCartByBrand, splitAmounts } from "../lib/commerce.js";
import { loadMemberSettings } from "../lib/memberSettings.js";
import { useAuth } from "../hooks.js";
import { track, EV } from "../lib/analytics.js";

function naira(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

/**
 * Bag — Apple-minimal: spare chrome, clear lines, one primary CTA.
 * Settlement copy makes the trust model explicit.
 */
export function BagPage({ go, onLogin }) {
  const { profile } = useAuth();
  const [, bump] = useState(0);
  const refresh = () => bump((x) => x + 1);
  const bag = loadBag();
  const me = loadMemberSettings();
  const [email, setEmail] = useState(me.email || profile?.email || "");
  const [phone, setPhone] = useState(me.phone || "");
  const [city, setCity] = useState(me.city || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const onBag = () => refresh();
    window.addEventListener("myyanga:bag", onBag);
    return () => window.removeEventListener("myyanga:bag", onBag);
  }, []);

  const subtotal = bagSubtotal();
  const split = splitAmounts(subtotal, DEFAULT_COMMISSION_PCT);
  const groups = groupCartByBrand(bag.items);

  const pay = async () => {
    setErr("");
    setMsg("");
    if (!bag.items.length) return;
    if (!email) {
      setErr("Add an email for your receipt");
      return;
    }
    setBusy(true);
    try {
      track(EV.UI_CLICK, { label: "retail_checkout_start", lines: bag.items.length, subtotal });
      const res = await checkoutBag({
        email,
        phone,
        shipping: { city, country: me.country || "Nigeria" },
      });
      if (res.testing) {
        setMsg(res.message || "Order settled");
        window.__toast?.(res.message || "Settled");
        refresh();
      }
    } catch (e) {
      if (/sign in/i.test(e.message || "") && onLogin) onLogin();
      setErr(e.message || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bag">
      <div className="wrap bag-head">
        <div className="crumbs">Home / Bag</div>
        <h1 className="bag-title">Bag</h1>
        <p className="bag-lead">{TRUST_COPY}</p>
      </div>

      <section className="section">
        <div className="wrap bag-layout">
          <div className="bag-lines">
            {!bag.items.length && (
              <div className="bag-empty">
                <p>Your bag is empty.</p>
                <button type="button" className="btn" onClick={() => go("shop")}>
                  Continue shopping
                </button>
              </div>
            )}
            {bag.items.map((it) => (
              <article key={it.key} className="bag-line">
                <img src={it.image} alt="" />
                <div className="bag-line-body">
                  <p className="bag-brand">{it.brand_name}</p>
                  <h2>{it.name}</h2>
                  <p className="muted">
                    {it.colour} · Size {it.size}
                  </p>
                  <div className="bag-qty">
                    <button type="button" onClick={() => { updateQty(it.key, it.qty - 1); refresh(); }}>
                      −
                    </button>
                    <span>{it.qty}</span>
                    <button type="button" onClick={() => { updateQty(it.key, it.qty + 1); refresh(); }}>
                      +
                    </button>
                    <button type="button" className="bag-remove" onClick={() => { removeFromBag(it.key); refresh(); }}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="bag-line-price">{naira(it.unit_price_ngn * it.qty)}</div>
              </article>
            ))}
          </div>

          <aside className="bag-summary">
            <h3>Summary</h3>
            <div className="bag-row">
              <span>Subtotal</span>
              <span>{naira(split.subtotal_ngn)}</span>
            </div>
            <div className="bag-row muted">
              <span>Designer receives (est.)</span>
              <span>{naira(split.brand_net_ngn)}</span>
            </div>
            <div className="bag-row muted">
              <span>MyYanga commission ({split.commission_pct}%)</span>
              <span>{naira(split.commission_ngn)}</span>
            </div>
            <p className="bag-split-note">
              Split happens at Flutterwave / Paystack — MyYanga does not hold purchase funds.
            </p>

            {groups.length > 1 && (
              <div className="bag-brands">
                <p className="tick-label">Designers in this bag</p>
                {groups.map((g) => (
                  <div key={g.creator_id} className="bag-row">
                    <span>{g.brand_name}</span>
                    <span>{naira(g.subtotal_ngn)}</span>
                  </div>
                ))}
              </div>
            )}

            <label className="bag-field">
              <span>Email for receipt</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </label>
            <label className="bag-field">
              <span>Mobile</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
            </label>
            <label className="bag-field">
              <span>City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" />
            </label>

            {err && <p className="pdp-err">{err}</p>}
            {msg && <p className="pdp-flash">{msg}</p>}

            <button type="button" className="btn btn-gold bag-checkout" disabled={!bag.items.length || busy} onClick={pay}>
              {busy ? "Connecting to Flutterwave…" : "Check Out"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => go("shop")}>
              Keep shopping
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}
