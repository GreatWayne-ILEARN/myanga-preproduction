import { useEffect, useState } from "react";
import { getFeatureGate, checkoutFeature } from "../lib/monetization.js";
import { track, EV } from "../lib/analytics.js";

/**
 * Wraps a paid feature. If admin set mode=paid and user hasn't paid,
 * shows a paywall with immediate gate enforcement.
 */
export function PayGate({ feature, children, onBlocked }) {
  const [gate, setGate] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getFeatureGate(feature)
      .then((g) => {
        setGate(g);
        track(EV.PAY_GATE, { feature, access: !!g?.access, paid: g?.mode === "paid" });
      })
      .catch((e) => setErr(e.message));
  }, [feature]);

  if (err) return <p className="muted">{err}</p>;
  if (!gate) return <p className="muted">Checking access…</p>;
  if (!gate.enabled) return <p className="muted">This feature is currently unavailable.</p>;
  if (gate.access) return children;

  const pay = async () => {
    setBusy(true);
    try {
      track(EV.PAY_GATE, { feature, action: "checkout_start" });
      await checkoutFeature(feature);
    } catch (e) {
      setErr(e.message);
      onBlocked?.(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 480, textAlign: "center", margin: "24px auto" }}>
      <div className="eyebrow">Premium feature</div>
      <h3 className="serif" style={{ margin: "8px 0" }}>
        Unlock {feature.replace(/_/g, " ")}
      </h3>
      <p className="muted" style={{ fontSize: 13 }}>
        Admin has set a fee of <strong>₦{Number(gate.price_ngn).toLocaleString()}</strong> for this
        feature. Payment is processed immediately via Flutterwave, Paystack, or Stripe.
      </p>
      <button className="btn btn-gold" style={{ marginTop: 16 }} disabled={busy} onClick={pay}>
        {busy ? "Redirecting…" : `Pay ₦${Number(gate.price_ngn).toLocaleString()} to continue`}
      </button>
    </div>
  );
}
