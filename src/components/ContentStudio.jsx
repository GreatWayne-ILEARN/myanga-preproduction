import React, { useEffect, useState } from "react";
import { resizeForDevices } from "../lib/responsiveImage.js";
import { isTesting } from "../lib/dataBridge.js";
import {
  loadTesterGarments,
  upsertTesterGarment,
  removeTesterGarment,
  loadSiteMedia,
  saveSiteMedia,
} from "../lib/testStore.js";
import { MOCK_GARMENTS } from "../lib/mockGarments.js";
import {
  PAGER_DEFAULTS,
  PAGER_FIELDS,
  loadPagerSettings,
  savePagerSettings,
  resetPagerSettings,
} from "../lib/pagerSettings.js";

/* Content Studio — visual page editor + Testing garment uploads.
   Production: owner-only page text/media (local until site_content table).
   Testing: owner + admin can edit pages AND upload mock-up garments
   used by Virtual Wear / Smart Search. */


const PAGES = {
  home: { label: "Home", blocks: { eyebrow: "● Explore ● Shop ● Win", headline: "The Best of African Fashion, in one spot.", sub: "Discover, shop and win across African fashion creativity." } },
  premium: { label: "Premium", blocks: { headline: "Join MyYanga Premium", sub: "Exclusive tips, early drops and member events." } },
  about: { label: "About", blocks: { headline: "About MyYanga", sub: "A pan-African fashion & creative marketplace by ZonicMe." } },
};
const KEY = "myyanga_site_content";
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };

const PARTS = ["main_outfit", "head_piece", "shoes", "jewellery", "bag", "belt"];
const STYLES = ["Agbada", "Kaftan", "Aso-Oke", "Lace", "Ankara", "Senator", "Gown", "Two-piece"];
const EVENTS = ["wedding", "corporate", "casual", "traditional", "date", "festival"];
const COLOURS = ["Coral", "Royal Blue", "Emerald", "Gold", "Burgundy", "White", "Navy"];

function GarmentUploadPanel() {
  const [list, setList] = useState(() => loadTesterGarments());
  const [form, setForm] = useState({
    name: "",
    part: "main_outfit",
    style: "Agbada",
    event: "wedding",
    colour: "Coral",
    price_ngn: 150000,
    creator: "Tester Brand",
    image: null,
  });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onImg = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const out = await resizeForDevices(f);
      set("image", out[out.length - 1].url);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!form.name.trim()) return window.__toast?.("Name required");
    if (!form.image) return window.__toast?.("Upload a garment image");
    const row = upsertTesterGarment({
      name: form.name.trim(),
      part: form.part,
      style: form.style,
      event_tags: [form.event],
      colours: [form.colour],
      gender: "unisex",
      price_ngn: Number(form.price_ngn) || 0,
      image: form.image,
      card_image: form.image,
      is_premium: true,
      creator: { name: form.creator || "Tester Brand" },
      creator_id: null,
    });
    setList(loadTesterGarments());
    setForm((f) => ({ ...f, name: "", image: null }));
    window.__toast?.(`Garment “${row.name}” ready for Virtual Wear`);
  };

  const remove = (id) => {
    removeTesterGarment(id);
    setList(loadTesterGarments());
    window.__toast?.("Garment removed");
  };

  return (
    <div style={{ marginTop: 28 }}>
      <h3 className="serif" style={{ marginBottom: 6 }}>Garment assets (Testing)</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Upload mock-up garment images for Virtual Wear and Smart Search. Seed catalogue has{" "}
        {MOCK_GARMENTS.length} built-in assets; your uploads appear first.
      </p>
      <div className="cs-grid">
        <div className="panel">
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Coral Aso-Oke Gele" />
          </div>
          <div className="field">
            <label>Part</label>
            <select value={form.part} onChange={(e) => set("part", e.target.value)}>
              {PARTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Style</label>
            <select value={form.style} onChange={(e) => set("style", e.target.value)}>
              {STYLES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Event</label>
            <select value={form.event} onChange={(e) => set("event", e.target.value)}>
              {EVENTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Colour</label>
            <select value={form.colour} onChange={(e) => set("colour", e.target.value)}>
              {COLOURS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Price (₦)</label>
            <input type="number" value={form.price_ngn} onChange={(e) => set("price_ngn", e.target.value)} />
          </div>
          <div className="field">
            <label>Creator / brand</label>
            <input value={form.creator} onChange={(e) => set("creator", e.target.value)} />
          </div>
          <div className="field">
            <label>Garment image (PNG with transparency preferred)</label>
            {form.image ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img src={form.image} alt="" style={{ height: 72, border: "1px solid var(--line)" }} />
                <button className="link-danger" onClick={() => set("image", null)}>Remove</button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={onImg} />
            )}
            {busy && <span className="muted" style={{ fontSize: 11 }}> sizing…</span>}
          </div>
          <button className="btn" onClick={save}>Save garment for testing</button>
        </div>
        <div className="panel" style={{ padding: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, padding: "8px 14px", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
            YOUR UPLOADS ({list.length})
          </div>
          <div className="del-rows">
            {list.map((g) => (
              <div className="del-row" key={g.id}>
                {g.image && <img src={g.image} alt="" style={{ width: 36, height: 48, objectFit: "cover" }} />}
                <span>{g.name} · {g.style} · ₦{Number(g.price_ngn).toLocaleString()}</span>
                <button className="link-danger" onClick={() => remove(g.id)}>Delete</button>
              </div>
            ))}
            {!list.length && (
              <p className="muted" style={{ padding: 14, fontSize: 13 }}>No uploads yet — seed mock garments still power Virtual Wear.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageBreaksPanel() {
  const [draft, setDraft] = useState(() => loadPagerSettings());
  const [saved, setSaved] = useState(() => loadPagerSettings());
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (id, v) => setDraft((d) => ({ ...d, [id]: v }));

  const publish = () => {
    const next = savePagerSettings(draft);
    setDraft(next);
    setSaved(next);
    window.__toast?.("Page breaks published — Shop / Search / Discover update live");
  };

  const discard = () => setDraft(saved);

  const restore = () => {
    const next = resetPagerSettings();
    setDraft(next);
    setSaved(next);
    window.__toast?.("Restored live-site defaults (Shop = 12)");
  };

  return (
    <div className="panel" style={{ marginTop: 28 }}>
      <h3 className="serif" style={{ marginTop: 0 }}>Page breaks</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        How many items show before the numbered break (‹ 1 2 3 ›). Same pattern as myyanga.com Shop — not infinite
        scroll. Range 1–48.
      </p>
      <div className="grid g3">
        {PAGER_FIELDS.map((f) => (
          <div className="field" key={f.id}>
            <label>{f.label}</label>
            <input
              type="number"
              min={1}
              max={48}
              value={draft[f.id] ?? PAGER_DEFAULTS[f.id]}
              onChange={(e) => set(f.id, e.target.value)}
            />
            <span className="muted" style={{ fontSize: 11 }}>{f.hint}</span>
          </div>
        ))}
      </div>
      <div className="action-row">
        <button className="btn" type="button" disabled={!dirty} onClick={publish}>
          Publish page breaks
        </button>
        <button className="btn btn-ghost" type="button" disabled={!dirty} onClick={discard}>
          Discard
        </button>
        <button className="btn btn-ghost" type="button" onClick={restore}>
          Restore defaults
        </button>
      </div>
    </div>
  );
}

export function ContentStudio({ role, profile }) {
  const testing = isTesting();
  const canEdit =
    role === "owner" ||
    profile?.is_owner ||
    profile?.is_co_owner ||
    (profile?.privileges || []).includes("content_studio") ||
    (testing && (role === "admin" || role === "owner"));
  const canGarments =
    canEdit ||
    (profile?.privileges || []).includes("garments") ||
    (testing && (role === "admin" || role === "owner"));
  const [page, setPage] = useState("home");
  const seed = loadSaved() || Object.fromEntries(Object.entries(PAGES).map(([k, v]) => [k, { ...v.blocks }]));
  const [draft, setDraft] = useState(seed);
  const [saved, setSaved] = useState(seed);
  const [media, setMedia] = useState(() => loadSiteMedia());
  const [sizes, setSizes] = useState(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || !!sizes;

  if (!canEdit) {
    return (
      <p className="muted">
        Content editing requires owner access
        {testing ? " (or admin in Testing mode). Sign in as tester@myyanga.test" : "."}
      </p>
    );
  }

  const setField = (k, v) => setDraft((d) => ({ ...d, [page]: { ...d[page], [k]: v } }));
  const onImg = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const out = await resizeForDevices(f);
      setSizes(out);
      setMedia((m) => {
        const next = { ...m, [page]: out[out.length - 1].url };
        saveSiteMedia(next);
        return next;
      });
    } finally {
      setBusy(false);
    }
  };
  const publish = () => {
    setSaved(draft);
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {}
    saveSiteMedia(media);
    setSizes(null);
    window.__toast?.("Published — changes are live in this browser");
  };
  const discard = () => {
    setDraft(saved);
    setSizes(null);
    setMedia((m) => ({ ...m, [page]: undefined }));
  };
  const b = draft[page] || {};

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0 }}>Content Studio</h2>
      <div className="cs-banner">
        {testing ? (
          <>
            <span><b>Testing mode</b> — admins and owners can upload page media and garment assets.</span>
            <span className="cs-pill">TESTER UPLOADS ON</span>
          </>
        ) : (
          <>
            Editing pages is a <b>super-admin-granted</b> right. <span className="cs-pill">EDITOR · GRANTED</span>
          </>
        )}
      </div>
      <div className="chips" style={{ marginBottom: 16 }}>
        {Object.entries(PAGES).map(([k, v]) => (
          <span
            key={k}
            className="chip"
            style={page === k ? { background: "var(--maroon)", color: "#fff" } : {}}
            onClick={() => setPage(k)}
          >
            {v.label}
          </span>
        ))}
      </div>

      <div className="cs-grid">
        <div>
          <div className="panel" style={{ marginBottom: 14 }}>
            <h4 style={{ margin: "0 0 10px" }}>Text on this page</h4>
            {Object.keys(b).map((k) => (
              <div className="field" key={k}>
                <label>{k}</label>
                {b[k] && b[k].length > 48 ? (
                  <textarea
                    value={b[k]}
                    onChange={(e) => setField(k, e.target.value)}
                    style={{ width: "100%", minHeight: 60, padding: 10, border: "1px solid var(--line)", fontFamily: "inherit" }}
                  />
                ) : (
                  <input value={b[k]} onChange={(e) => setField(k, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div className="panel">
            <h4 style={{ margin: "0 0 10px" }}>Hero media — auto-sized for every device</h4>
            {media[page] ? (
              <>
                <div style={{ display: "flex", gap: 12 }}>
                  {(sizes || []).map((s) => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <img src={s.url} alt="" style={{ height: 56, border: "1px solid var(--line)" }} />
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>
                        {s.label}
                        <br />
                        {s.width}×{s.height} · {s.kb}KB
                      </div>
                    </div>
                  ))}
                  {!sizes?.length && (
                    <img src={media[page]} alt="" style={{ height: 56, border: "1px solid var(--line)" }} />
                  )}
                </div>
                <button
                  className="link-danger"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setMedia((m) => {
                      const next = { ...m, [page]: undefined };
                      saveSiteMedia(next);
                      return next;
                    });
                    setSizes(null);
                  }}
                >
                  Remove image
                </button>
              </>
            ) : (
              <label style={{ display: "block", fontSize: 13 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  {busy ? "Generating Mobile / Tablet / Desktop…" : "Add an image — device sizes are created automatically"}
                </span>
                <input type="file" accept="image/*" onChange={onImg} style={{ display: "block", marginTop: 6 }} />
              </label>
            )}
          </div>
        </div>

        <div className="panel" style={{ background: "var(--cream)", padding: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, padding: "8px 14px", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
            LIVE PREVIEW · {PAGES[page].label.toUpperCase()}
          </div>
          <div style={{ padding: 18 }}>
            {b.eyebrow && <div className="eyebrow">{b.eyebrow}</div>}
            <h3 className="serif" style={{ fontSize: 26, margin: "6px 0" }}>{b.headline}</h3>
            <p className="muted">{b.sub}</p>
            {media[page] && <img src={media[page]} alt="" style={{ width: "100%", marginTop: 12, border: "1px solid var(--line)" }} />}
          </div>
        </div>
      </div>

      <div className="cs-publish">
        <span className="muted" style={{ fontSize: 13 }}>{dirty ? "You have unpublished changes." : "All changes published."}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={discard} disabled={!dirty}>Discard</button>
          <button className="btn" onClick={publish} disabled={!dirty}>Publish changes</button>
        </div>
      </div>

      {canEdit && <PageBreaksPanel />}

      {testing && canGarments && <GarmentUploadPanel />}
    </div>
  );
}
