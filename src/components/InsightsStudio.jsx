import React, { useMemo, useState } from "react";
import { Data, isProduction } from "../lib/dataBridge.js";
import { hasSupabase, supabase } from "../lib/supabase.js";
import {
  EV,
  RETURN_REASONS,
  loadAnalyticsEvents,
  filterAnalyticsEvents,
  aggregateFashionAnalytics,
  buildBrandInsightPack,
  insightContextForAi,
} from "../lib/analytics.js";

const PRESET_QUESTIONS = [
  "Which colours convert best for this brand?",
  "What fit / scene patterns show up in Virtual Wear?",
  "Which price bands get the most engagement?",
  "Where should this brand focus inventory next month?",
  "Summarise return-risk signals (if any) and merchandising implications.",
];

const EVENT_OPTIONS = [
  EV.PAGE_VIEW,
  EV.UI_CLICK,
  EV.SEARCH,
  EV.PRODUCT_SELECT,
  EV.VW_RENDER,
  EV.VW_SHARE,
  EV.PAY_GATE,
  EV.AUTH_METHOD,
  EV.RETURN_REASON,
];

function useCreators() {
  const [list, setList] = useState([]);
  React.useEffect(() => {
    Data.creators().then((rows) => setList(rows || []));
  }, []);
  return list;
}

/**
 * Admin Insights studio — guided filters + AI ask, brand-scoped packs.
 * Monetizable on MyYanga; exportable to ZonicMe Orbit via orbit_brand_key.
 */
export function InsightsStudio() {
  const creators = useCreators();
  const [brandId, setBrandId] = useState("");
  const [days, setDays] = useState(30);
  const [gender, setGender] = useState("");
  const [colour, setColour] = useState("");
  const [style, setStyle] = useState("");
  const [part, setPart] = useState("");
  const [view, setView] = useState("");
  const [eventTicks, setEventTicks] = useState(() => new Set([EV.PRODUCT_SELECT, EV.VW_RENDER, EV.SEARCH, EV.VW_SHARE]));
  const [ask, setAsk] = useState(PRESET_QUESTIONS[0]);
  const [aiOut, setAiOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportJson, setExportJson] = useState("");

  const brand = creators.find((c) => String(c.id) === String(brandId));

  const pack = useMemo(() => {
    const events = loadAnalyticsEvents({ limit: 5000 });
    const filtered = filterAnalyticsEvents(events, {
      brandId: brandId || undefined,
      days: +days,
      gender: gender || undefined,
      colour: colour || undefined,
      style: style || undefined,
      part: part || undefined,
      view: view || undefined,
      events: [...eventTicks],
    });
    if (brandId) {
      return buildBrandInsightPack({
        brandId,
        brandName: brand?.name,
        days: +days,
        events: filtered,
      });
    }
    const agg = aggregateFashionAnalytics(filtered);
    return {
      portal: "myyanga",
      brand_id: null,
      brand_name: "All brands",
      orbit_brand_key: null,
      window_days: +days,
      generated_at: new Date().toISOString(),
      anonymized: true,
      metrics: agg,
      event_count: filtered.length,
    };
  }, [brandId, brand?.name, days, gender, colour, style, part, view, eventTicks]);

  const toggleEvent = (ev) => {
    setEventTicks((prev) => {
      const n = new Set(prev);
      if (n.has(ev)) n.delete(ev);
      else n.add(ev);
      return n;
    });
  };

  const runAi = async () => {
    setBusy(true);
    setAiOut("");
    try {
      const context = insightContextForAi(pack);
      const prompt =
        `You are MyYanga Insights for fashion merchandising. Data is anonymized (no PII).\n` +
        `Brand scope: ${pack.brand_name || "All"} (${pack.orbit_brand_key || "portal-wide"}).\n` +
        `Question: ${ask}\n\n` +
        `Metrics JSON:\n${context}\n\n` +
        `Answer with 4–7 concrete bullets: what is working, what to stock/drop, try-on/fit notes, and one monetization angle for the brand.`;

      if (hasSupabase && isProduction()) {
        const { data: sess } = await supabase.auth.getSession();
        const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/ai-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ prompt }),
        });
        const d = await r.json().catch(() => ({}));
        setAiOut(d.text || d.error || "No AI response");
      } else {
        // Deterministic local insight when AI edge is offline
        const cols = pack.metrics?.attributes?.colours?.[0];
        const styles = pack.metrics?.attributes?.styles?.[0];
        setAiOut(
          [
            `Local insight (Testing — deploy ai-chat + ANTHROPIC_API_KEY for live AI).`,
            `· Scope: ${pack.brand_name} · ${pack.event_count} events / ${pack.window_days}d`,
            cols ? `· Leading colour signal: ${cols.key} (${cols.count})` : `· Colour signal: insufficient selects yet`,
            styles ? `· Leading style: ${styles.key} (${styles.count})` : `· Style signal: insufficient selects yet`,
            `· Try-ons: ${pack.metrics?.fit?.vw_renders || 0} (AI ${pack.metrics?.fit?.ai || 0} / canvas ${pack.metrics?.fit?.canvas || 0})`,
            `· Monetize: sell a Brand Insights pack + reel slots against top colour/style; export pack to Orbit as ${pack.orbit_brand_key || "portal rollup"}.`,
            `· Your question: ${ask}`,
          ].join("\n"),
        );
      }
    } catch (e) {
      setAiOut(e.message || "Insight failed");
    } finally {
      setBusy(false);
    }
  };

  const doExport = () => {
    const payload = {
      ...pack,
      question: ask,
      ai_summary: aiOut || null,
      export_target: "zonicme_orbit",
    };
    setExportJson(JSON.stringify(payload, null, 2));
    try {
      navigator.clipboard?.writeText(JSON.stringify(payload));
      window.__toast?.("Orbit insight pack copied");
    } catch {
      window.__toast?.("Export ready below");
    }
  };

  const Attr = ({ title, rows }) => (
    <div className="panel" style={{ margin: 0 }}>
      <div className="tick-label">{title}</div>
      {(rows || []).slice(0, 6).map((r) => (
        <div key={r.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
          <span>{r.key}</span>
          <span className="muted">{r.count}</span>
        </div>
      ))}
      {!rows?.length && <p className="muted" style={{ fontSize: 12 }}>No data in filter</p>}
    </div>
  );

  return (
    <div style={{ marginTop: 28 }}>
      <h3 className="serif" style={{ marginTop: 0 }}>Insights studio</h3>
      <p className="muted" style={{ fontSize: 12 }}>
        Both modes: tick filters / brand, then Ask AI — or pick a preset question. Brand ={" "}
        <b>creators.id</b> (unique). Orbit key = <code>myyanga:creator:&lt;id&gt;</code>.
      </p>

      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="field">
          <label>Brand (creator)</label>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">All brands (portal)</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · id {c.id}
                {c.slug ? ` · ${c.slug}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Window (days)</label>
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              {[7, 14, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Any</option>
              <option value="male">His</option>
              <option value="female">Hers</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div className="field">
            <label>Colour contains</label>
            <input value={colour} onChange={(e) => setColour(e.target.value)} placeholder="e.g. Gold" />
          </div>
          <div className="field">
            <label>Style</label>
            <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. Agbada" />
          </div>
          <div className="field">
            <label>Part</label>
            <select value={part} onChange={(e) => setPart(e.target.value)}>
              <option value="">Any</option>
              <option value="main_outfit">Outfit</option>
              <option value="shoes">Shoes</option>
              <option value="bag">Bag</option>
              <option value="head_piece">Head piece</option>
              <option value="jewellery">Jewellery</option>
            </select>
          </div>
          <div className="field">
            <label>View</label>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="">Any</option>
              {["home", "shop", "smart", "virtualwear", "reels", "discover", "explore"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tick-label" style={{ marginTop: 8 }}>
          Event types
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {EVENT_OPTIONS.map((ev) => (
            <label key={ev} className={"tick-box" + (eventTicks.has(ev) ? " on" : "")} style={{ padding: "8px 10px" }}>
              <input type="checkbox" checked={eventTicks.has(ev)} onChange={() => toggleEvent(ev)} style={{ display: "none" }} />
              <span className="tick-text" style={{ fontSize: 11 }}>
                {ev}
              </span>
            </label>
          ))}
        </div>

        <div className="field">
          <label>Ask AI (or pick a preset)</label>
          <select value={PRESET_QUESTIONS.includes(ask) ? ask : ""} onChange={(e) => e.target.value && setAsk(e.target.value)}>
            <option value="">Custom question below…</option>
            {PRESET_QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <textarea
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            style={{ width: "100%", minHeight: 64, marginTop: 8, padding: 10, border: "1px solid var(--line)", fontFamily: "inherit" }}
          />
        </div>

        <div className="vw-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-gold" disabled={busy} onClick={runAi}>
            {busy ? "Generating…" : "Generate insight"}
          </button>
          <button type="button" className="btn" onClick={doExport}>
            Export Orbit pack
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11 }}>
          Matched events: <b>{pack.event_count}</b>
          {pack.orbit_brand_key ? ` · ${pack.orbit_brand_key}` : " · portal-wide"}
        </p>
      </div>

      <div className="grid g3" style={{ marginTop: 16 }}>
        <Attr title="Colours" rows={pack.metrics?.attributes?.colours} />
        <Attr title="Styles" rows={pack.metrics?.attributes?.styles} />
        <Attr title="Parts" rows={pack.metrics?.attributes?.parts} />
      </div>

      {aiOut && (
        <div className="panel" style={{ marginTop: 16, whiteSpace: "pre-wrap", fontSize: 13 }}>
          <div className="tick-label">Insight</div>
          {aiOut}
        </div>
      )}

      {exportJson && (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="tick-label">Orbit export JSON</div>
          <pre style={{ fontSize: 11, overflow: "auto", maxHeight: 220, margin: 0 }}>{exportJson}</pre>
        </div>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        Return reasons tracked: {RETURN_REASONS.join(", ")}. Counts appear after retail returns.
      </p>
    </div>
  );
}
