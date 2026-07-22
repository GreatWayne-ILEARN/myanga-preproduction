import React, { useEffect, useMemo, useState } from "react";
import { PayGate } from "../components/PayGate.jsx";
import { supabase, hasSupabase } from "../lib/supabase.js";
import { renderLook, shareLookNative } from "../lib/virtualWear.js";
import { Data, isProduction } from "../lib/dataBridge.js";
import { GENDER_OPTIONS, STYLE_OPTIONS } from "../lib/catalog.js";
import { saveLocalLook, lookShareUrl, openLookInApp, copyText } from "../lib/lookShare.js";
import { track, trackProductSelect, trackVwRender, EV } from "../lib/analytics.js";
import {
  VW_EVENT_SCENES,
  assembleRotatedLook,
  markOutfitWorn,
  eligibleVwOutfits,
  paidVwBrandIds,
} from "../lib/vwPool.js";

const naira = (n) => "₦" + Number(n || 0).toLocaleString();

const PART_LABEL = {
  main_outfit: "Outfit",
  shoes: "Shoes",
  bag: "Bag",
  head_piece: "Head piece",
  jewellery: "Jewellery",
};

function VirtualWearInner({ go }) {
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [gender, setGender] = useState("");
  const [scene, setScene] = useState("wedding");
  const [outfitType, setOutfitType] = useState("");
  const [creators, setCreators] = useState([]);
  const [allGarments, setAllGarments] = useState([]);
  const [outfit, setOutfit] = useState(null);
  const [shoe, setShoe] = useState(null);
  const [bag, setBag] = useState(null);
  const [brand, setBrand] = useState(null);
  const [render, setRender] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shareCode, setShareCode] = useState(null);
  const [renderMode, setRenderMode] = useState(null);
  const [poolMeta, setPoolMeta] = useState({ size: 0, recycled: false });
  const [err, setErr] = useState("");

  useEffect(() => {
    Data.creators().then(setCreators);
    Data.garments().then((rows) => setAllGarments(rows || []));
  }, []);

  const poolBrandCount = paidVwBrandIds(creators).size;

  const previewPoolSize = useMemo(() => {
    if (!gender || !outfitType) return 0;
    return eligibleVwOutfits({
      garments: allGarments,
      creators,
      gender,
      scene,
      style: outfitType,
    }).length;
  }, [allGarments, creators, gender, scene, outfitType]);

  const selectedItems = useMemo(() => [outfit, shoe, bag].filter(Boolean), [outfit, shoe, bag]);
  const total = selectedItems.reduce((s, g) => s + (g.price_ngn || 0), 0);
  const shareUrl = shareCode ? lookShareUrl(shareCode) : null;

  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setPhoto(ev.target.result);
    r.readAsDataURL(f);
  };

  const persistLook = async (image, items, mode, brandName) => {
    const code = `LK${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      title: items[0]?.name || "MyYanga look",
      scene,
      garment_ids: items.map((g) => g.id).filter(Boolean),
      total_ngn: items.reduce((s, g) => s + (g.price_ngn || 0), 0),
      image,
      share_code: code,
      is_public: true,
      designer_name: brandName || null,
      render_mode: mode,
    };
    saveLocalLook(payload);
    if (hasSupabase && isProduction()) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          await supabase.from("looks").insert({
            user_id: sess.session.user.id,
            title: payload.title,
            scene: payload.scene,
            garment_ids: payload.garment_ids,
            total_ngn: payload.total_ngn,
            image: payload.image,
            share_code: code,
            is_public: true,
          });
        }
      } catch {
        /* local share still works */
      }
    }
    setShareCode(code);
    return code;
  };

  const runRotation = async () => {
    if (!photo) return window.__toast?.("Upload a photo first");
    if (!gender) return window.__toast?.("Pick His or Hers");
    if (!outfitType) return window.__toast?.("Pick an outfit type");
    if (!scene) return window.__toast?.("Pick an event theme");

    setBusy(true);
    setErr("");
    try {
      const picked = assembleRotatedLook({
        garments: allGarments,
        creators,
        gender,
        scene,
        style: outfitType,
      });
      if (!picked.ok) {
        setErr(
          `No paid-pool outfits match ${outfitType} for ${scene}. Brands must be promoted into Virtual Wear and tag garments with this event + style.`,
        );
        window.__toast?.("No matching outfits in the paid pool");
        return;
      }

      setOutfit(picked.outfit);
      setShoe(picked.shoe || null);
      setBag(picked.bag || null);
      setBrand(picked.brand || null);
      setPoolMeta({ size: picked.poolSize, recycled: picked.recycled });
      trackProductSelect(picked.outfit, { context: "vw_pool_rotate", scene, style: outfitType });

      const out = await renderLook({
        photoDataUrl: photo,
        garments: picked.items,
        scene,
      });
      setRender(out.image);
      setRenderMode(out.mode);
      markOutfitWorn(picked.outfit.id);
      trackVwRender({
        scene,
        gender,
        designerId: picked.outfit.creator_id,
        garments: picked.items,
        mode: out.mode,
      });
      track(EV.VW_RENDER, {
        pool: "paid_promoted",
        style: outfitType,
        recycled: picked.recycled,
        pool_size: picked.poolSize,
      });
      await persistLook(out.image, picked.items, out.mode, picked.brand?.name);
      if (picked.recycled) window.__toast?.("You've seen this pool — rotating again");
      else if (out.mode === "ai") window.__toast?.("AI try-on from the paid brand pool");
      else
        window.__toast?.(
          isProduction()
            ? "On-device preview — Gemini AI offline (set GOOGLE_API_KEY on virtual-tryon)"
            : "Testing preview from the paid brand pool (canvas compositing)",
        );
      setStep(3);
    } catch (e) {
      setErr(e.message || "Could not generate look");
      window.__toast?.(e.message || "Could not generate look");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!render) return;
    track(EV.VW_SHARE, { designer_id: outfit?.creator_id, scene, mode: renderMode, style: outfitType });
    const ok = await shareLookNative(render, outfit?.name || "My MyYanga look");
    if (!ok) {
      const a = document.createElement("a");
      a.href = render;
      a.download = "myyanga-look.jpg";
      a.click();
      window.__toast?.("Image downloaded");
    }
  };

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">Home / Virtual Wear</div>
        <h1>Virtual Wear</h1>
        <p className="lead">
          Upload your photo, choose event theme and outfit type — we dress you from brands that paid into the Virtual
          Wear pool. Looks are randomized; you won’t get the same outfit twice until the pool cycles.
        </p>
        <div className="vw-steps" aria-label="Progress">
          {["Photo", "Theme & outfit type", "Your look"].map((s, i) => (
            <span key={s} className={"vw-step" + (step >= i + 1 ? " on" : "")}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Paid brands in pool: <b>{poolBrandCount}</b>
          {gender && outfitType ? (
            <>
              {" "}
              · matching looks left for you: <b>{previewPoolSize}</b>
            </>
          ) : null}
        </p>
      </div>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="wrap">
          {step === 1 && (
            <div style={{ maxWidth: 520 }}>
              <label className="drop">
                {photo ? <img src={photo} alt="" style={{ maxHeight: 220 }} /> : "Tap to upload your photo"}
                <input type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
              </label>
              <div className="vw-actions">
                <button type="button" className="btn" disabled={!photo} onClick={() => setStep(2)}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="panel" style={{ maxWidth: 640 }}>
              <div className="tick-label">His or Hers</div>
              <div className="gender-row" style={{ marginBottom: 18 }}>
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={"gender-btn" + (gender === g.id ? " on" : "")}
                    onClick={() => setGender(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="tick-label">Event theme (critical)</div>
              <div className="designer-row" style={{ marginBottom: 18 }}>
                {VW_EVENT_SCENES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={"designer-card" + (scene === s.id ? " on" : "")}
                    onClick={() => setScene(s.id)}
                  >
                    <strong>{s.label}</strong>
                    <span>Event tag: {s.event}</span>
                  </button>
                ))}
              </div>

              <div className="tick-label">Outfit type (critical)</div>
              <div className="designer-row" style={{ marginBottom: 18 }}>
                {STYLE_OPTIONS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={"designer-card" + (outfitType === st ? " on" : "")}
                    onClick={() => setOutfitType(st)}
                  >
                    <strong>{st}</strong>
                    <span>Silhouette / style</span>
                  </button>
                ))}
              </div>

              {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

              <div className="vw-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-gold"
                  disabled={!gender || !outfitType || !scene || busy}
                  onClick={runRotation}
                >
                  {busy ? "Dressing you…" : "See me in a look"}
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                Random outfit from promoted brands · matched to <b>{scene}</b> + <b>{outfitType || "…"}</b> · never
                repeats an outfit you’ve already worn.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="vw-result">
              <div className="look" style={{ maxWidth: 480, width: "100%" }}>
                <div className="head">
                  <span style={{ fontWeight: 800 }}>{outfit?.name || "Your look"}</span>
                  <span style={{ fontSize: 11 }}>
                    {brand?.name || "Brand"}
                    {renderMode === "ai" ? " · AI" : " · preview"} · {scene} · {outfitType}
                  </span>
                </div>
                {render ? (
                  <img src={render} alt="" style={{ width: "100%", display: "block" }} />
                ) : (
                  <div className="img" style={{ background: "var(--maroon)", aspectRatio: "3/4" }}>
                    Preview
                  </div>
                )}
                <div className="items">
                  {selectedItems.map((it) => (
                    <div className="it" key={it.id}>
                      <span>
                        {it.name}{" "}
                        <span className="muted">({PART_LABEL[it.part] || it.part})</span>
                      </span>
                      <span>{naira(it.price_ngn)}</span>
                    </div>
                  ))}
                  <div className="tot">
                    <span>Total look</span>
                    <span>{naira(total)}</span>
                  </div>
                </div>
                <div className="vw-actions" style={{ padding: 12, marginTop: 0 }}>
                  <button type="button" className="btn btn-gold" disabled={busy} onClick={runRotation}>
                    {busy ? "…" : "Try another look"}
                  </button>
                  <button type="button" className="btn" onClick={share}>
                    Share
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                    Change theme / type
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => go?.("shop")}>
                    Shop look
                  </button>
                </div>
                {poolMeta.recycled && (
                  <p className="muted" style={{ fontSize: 12, padding: "0 12px 8px" }}>
                    Pool recycled — you’d already seen every matching outfit.
                  </p>
                )}
                {shareUrl && (
                  <div style={{ padding: "0 12px 14px" }}>
                    <div className="tick-label">Comment link</div>
                    <button type="button" className="vw-share-url" onClick={() => openLookInApp(shareCode)}>
                      {shareUrl}
                    </button>
                    <div className="vw-actions" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          const ok = await copyText(shareUrl);
                          window.__toast?.(ok ? "Copied" : shareUrl);
                        }}
                      >
                        Copy link
                      </button>
                      {brand?.whatsapp && (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`https://wa.me/${String(brand.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${brand.name}, I tried your look on MyYanga Virtual Wear.`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Message brand
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function VirtualWearPage({ go }) {
  return (
    <PayGate feature="virtual_wear">
      <VirtualWearInner go={go} />
    </PayGate>
  );
}
