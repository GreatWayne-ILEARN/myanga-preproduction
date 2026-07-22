import { useEffect, useState } from "react";
import { listMonetizationSettings, saveMonetizationSetting } from "../lib/monetization.js";

const FEATURES = [
  { id: "virtual_wear", label: "Virtual Wear" },
  { id: "smart_search", label: "Smart Search" },
  { id: "pyl_entry", label: "Post Your Look entry" },
  { id: "premium", label: "Premium membership" },
  { id: "events", label: "Events access" },
  { id: "creator_promotion", label: "Virtual Wear + Discover promotion (paid brand pool)" },
];

const PROVIDERS = ["flutterwave", "paystack", "stripe"];

export function MonetizationStudio() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () =>
    listMonetizationSettings()
      .then(setRows)
      .catch(() => setRows([]));

  useEffect(() => {
    load();
  }, []);

  const get = (f) => rows.find((r) => r.feature === f) || { feature: f, mode: "free", price_ngn: 0 };

  const save = async (feature, patch) => {
    setBusy(true);
    try {
      await saveMonetizationSetting({ ...get(feature), feature, ...patch });
      window.__toast?.("Saved — gate is live immediately");
      load();
    } catch (e) {
      window.__toast?.(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0 }}>
        Monetization Studio
      </h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
        Set each feature to <strong>free</strong> or <strong>paid</strong>. When you save a price,
        the payment gate is enforced immediately — Flutterwave → Paystack → Stripe in that order
        (reorder below).
      </p>
      {FEATURES.map(({ id, label }) => {
        const r = get(id);
        return (
          <div key={id} className="panel" style={{ marginBottom: 14, maxWidth: 640 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{label}</strong>
              <label style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={r.enabled !== false}
                  onChange={(e) => save(id, { enabled: e.target.checked })}
                />{" "}
                Enabled
              </label>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>Mode</label>
              <select
                value={r.mode || "free"}
                onChange={(e) => save(id, { mode: e.target.value })}
                disabled={busy}
              >
                <option value="free">Free (freemium)</option>
                <option value="paid">Paid — gate enforced</option>
              </select>
            </div>
            {r.mode === "paid" && (
              <>
                <div className="field">
                  <label>Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={r.price_ngn || 0}
                    onChange={(e) => save(id, { price_ngn: +e.target.value })}
                    onBlur={() => save(id, { price_ngn: r.price_ngn })}
                  />
                </div>
                <div className="field">
                  <label>Billing</label>
                  <select
                    value={r.billing || "one_time"}
                    onChange={(e) => save(id, { billing: e.target.value })}
                  >
                    <option value="one_time">One-time</option>
                    <option value="days_30">30 days</option>
                    <option value="days_365">365 days</option>
                  </select>
                </div>
                <div className="field">
                  <label>Provider order (first available wins)</label>
                  <div className="chips">
                    {PROVIDERS.map((p) => (
                      <span
                        key={p}
                        className="chip"
                        style={
                          (r.provider_order || PROVIDERS).includes(p)
                            ? { background: "var(--maroon)", color: "#fff" }
                            : {}
                        }
                        onClick={() => {
                          const cur = r.provider_order || [...PROVIDERS];
                          const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
                          save(id, { provider_order: next.length ? next : PROVIDERS });
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
