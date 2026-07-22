import React, { useEffect, useMemo, useState } from "react";
import { Data } from "../lib/dataBridge.js";
import { addToBag } from "../lib/cartStore.js";
import {
  sizesForGarment,
  coloursForGarment,
  isBrandShopReady,
  SIZE_GUIDE_HINTS,
  TRUST_COPY,
} from "../lib/commerce.js";
import { track, EV } from "../lib/analytics.js";

function naira(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

/**
 * Product detail — Apple minimal chrome, Selfridges-complete size/colour matrix.
 * Cart only when brand is e-vetted.
 */
export function ProductPage({ garmentId, go }) {
  const [garment, setGarment] = useState(null);
  const [creator, setCreator] = useState(null);
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [gs, cs] = await Promise.all([Data.garments(), Data.creators()]);
      if (!alive) return;
      const g = (gs || []).find((x) => String(x.id) === String(garmentId));
      setGarment(g || null);
      const c = (cs || []).find((x) => x.id === g?.creator_id) || null;
      setCreator(c);
      if (g) {
        const cols = coloursForGarment(g);
        setColour(cols[0] || "");
        const sz = sizesForGarment(g);
        if (sz.length === 1) setSize(sz[0]);
        track(EV.PRODUCT_VIEW, { garment_id: g.id, creator_id: g.creator_id });
      }
    })();
    return () => {
      alive = false;
    };
  }, [garmentId]);

  const sizes = useMemo(() => (garment ? sizesForGarment(garment) : []), [garment]);
  const colours = useMemo(() => (garment ? coloursForGarment(garment) : []), [garment]);
  const shopReady = isBrandShopReady(creator);
  const guide = SIZE_GUIDE_HINTS[garment?.part] || SIZE_GUIDE_HINTS.main_outfit;

  if (!garment) {
    return (
      <div className="wrap page-head">
        <p className="muted">Loading piece…</p>
        <button type="button" className="btn btn-ghost" onClick={() => go("shop")}>
          Back to Shop
        </button>
      </div>
    );
  }

  const add = () => {
    setErr("");
    try {
      addToBag({ garment, creator, size, colour, qty: 1 });
      setFlash("Added to bag");
      window.__toast?.("Added to bag");
      track(EV.UI_CLICK, { label: "add_to_bag", garment_id: garment.id });
      setTimeout(() => setFlash(""), 1800);
    } catch (e) {
      setErr(e.message || "Could not add");
    }
  };

  return (
    <div className="pdp">
      <div className="wrap pdp-crumbs">
        <button type="button" className="pdp-link" onClick={() => go("shop")}>
          Shop
        </button>
        <span>/</span>
        <span>{creator?.name || "Designer"}</span>
        <span>/</span>
        <span>{garment.name}</span>
      </div>

      <div className="wrap pdp-grid">
        <div className="pdp-media">
          <img src={garment.image} alt={garment.name} />
        </div>

        <div className="pdp-info">
          <p className="pdp-brand">{creator?.name}</p>
          <h1 className="pdp-title">{garment.name}</h1>
          <p className="pdp-price">{naira(garment.price_ngn)}</p>
          <p className="pdp-meta">
            {[garment.style, garment.part?.replace(/_/g, " "), garment.country || creator?.country]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {shopReady ? (
            <p className="pdp-trust">E-vetted designer · Cart open · {TRUST_COPY.split(".")[0]}.</p>
          ) : (
            <p className="pdp-trust pdp-trust-warn">
              This designer is not e-vetted yet. You can browse the look; shopping cart unlocks after MyYanga
              e-vetting and settlement setup.
            </p>
          )}

          <div className="pdp-block">
            <div className="pdp-label-row">
              <span className="pdp-label">Colour</span>
            </div>
            <div className="pdp-swatches">
              {colours.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={"pdp-swatch" + (colour === c ? " on" : "")}
                  onClick={() => setColour(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="pdp-block">
            <div className="pdp-label-row">
              <span className="pdp-label">Size</span>
              <button type="button" className="pdp-link" onClick={() => setGuideOpen((v) => !v)}>
                Size guide
              </button>
            </div>
            <div className="pdp-sizes">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"pdp-size" + (size === s ? " on" : "")}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {guideOpen && (
              <div className="pdp-guide">
                <strong>{guide.title}</strong>
                <table>
                  <tbody>
                    {(guide.rows || []).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (
                          <td key={j}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>{guide.note}</p>
              </div>
            )}
          </div>

          {err && <p className="pdp-err">{err}</p>}
          {flash && <p className="pdp-flash">{flash}</p>}

          <div className="pdp-actions">
            <button type="button" className="btn pdp-bag-btn" disabled={!shopReady} onClick={add}>
              {shopReady ? "Add to Bag" : "Cart locked — awaiting e-vetting"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => go("bag")}>
              View Bag
            </button>
          </div>

          <ul className="pdp-bullets">
            <li>Secure checkout via Flutterwave / Paystack</li>
            <li>Funds settle to the designer; MyYanga commission splits at the gateway</li>
            <li>Composition & care shared by the brand at fulfilment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
