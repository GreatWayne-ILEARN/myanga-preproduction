/**
 * MyYanga anonymized fashion analytics.
 *
 * Privacy rules (always):
 * - No email, name, phone, photo, free-text that may contain PII
 * - Session + device IDs are random UUIDs (not account IDs)
 * - Product signals use internal ids + fashion attributes only
 *
 * Pillars:
 * 1. Hyper-granular product analytics (SKU / attribute conversion)
 * 2. Customer behaviour & fit signals (browse, VW, reels)
 * 3. Supply / merchandising (impressions, designer pool, placements)
 */

export const ANALYTICS_VERSION = 1;

/** Event names — keep stable for warehouse extraction. */
export const EV = {
  PAGE_VIEW: "page_view",
  UI_CLICK: "ui_click",
  SEARCH: "search",
  FILTER_CHANGE: "filter_change",
  PRODUCT_IMPRESSION: "product_impression",
  PRODUCT_VIEW: "product_view",
  PRODUCT_SELECT: "product_select",
  ATTRIBUTION_TOUCH: "attribute_touch",
  VW_STEP: "vw_step",
  VW_RENDER: "vw_render",
  VW_SHARE: "vw_share",
  VW_ENGAGE_DESIGNER: "vw_engage_designer",
  REEL_OPEN: "reel_open",
  REEL_PANE: "reel_pane",
  REEL_CHANNEL: "reel_channel",
  PAY_GATE: "pay_gate",
  AUTH_METHOD: "auth_method",
  RETURN_REASON: "return_reason", // ready for retail checkout
  MERCH_IMPRESSION: "merch_impression",
};

export const RETURN_REASONS = [
  "too_large",
  "too_small",
  "color_inaccurate",
  "poor_fabric_quality",
  "style_not_as_shown",
  "damaged",
  "late_delivery",
  "changed_mind",
  "other",
];

const SESSION_KEY = "myyanga_anon_session";
const DEVICE_KEY = "myyanga_anon_device";
const QUEUE_KEY = "myyanga_analytics_queue";
const MAX_QUEUE = 2000;

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `a${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnonSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "session_ephemeral";
  }
}

export function getAnonDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "device_ephemeral";
  }
}

/** Map price to merchandising band (no exact wallet signal). */
export function priceBand(ngn) {
  const n = Number(ngn) || 0;
  if (n <= 0) return "unknown";
  if (n < 50000) return "under_50k";
  if (n < 150000) return "50k_150k";
  if (n < 300000) return "150k_300k";
  if (n < 500000) return "300k_500k";
  return "500k_plus";
}

/**
 * Strip a garment/product to warehouse-safe attribute payload.
 * Never include name strings that could identify a person; garment titles are commercial SKUs — OK.
 */
export function productAttrs(g = {}) {
  if (!g || typeof g !== "object") return {};
  return {
    sku_id: g.id ?? null,
    creator_id: g.creator_id ?? g.creator?.id ?? null,
    part: g.part || null,
    style: g.style || null,
    gender: g.gender || null,
    colours: Array.isArray(g.colours) ? g.colours.slice(0, 6) : [],
    categories: Array.isArray(g.categories) ? g.categories.slice(0, 6) : [],
    event_tags: Array.isArray(g.event_tags) ? g.event_tags.slice(0, 6) : [],
    country: g.country || g.creator?.country || null,
    price_band: priceBand(g.price_ngn),
    is_premium: !!g.is_premium,
    promoted: !!(g.creator?.is_promoted || g.is_promoted),
  };
}

/** Sanitize free-form props — drop keys that look like PII. */
function sanitizeProps(props = {}) {
  const out = {};
  const blocked = /email|phone|password|name|photo|avatar|token|address|whatsapp/i;
  for (const [k, v] of Object.entries(props || {})) {
    if (blocked.test(k)) continue;
    if (v == null) continue;
    if (typeof v === "string") {
      // Cap length; drop strings that look like emails/phones
      if (/@/.test(v) || /^\+?\d{10,}$/.test(v.replace(/\s/g, ""))) continue;
      out[k] = v.slice(0, 120);
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 12).map((x) => (typeof x === "string" ? x.slice(0, 64) : x));
    } else if (typeof v === "object") {
      out[k] = sanitizeProps(v);
    }
  }
  return out;
}

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {
    /* quota */
  }
}

/**
 * Track one anonymized interaction.
 * @param {string} event
 * @param {object} props
 */
export function track(event, props = {}) {
  if (typeof window === "undefined") return;
  const row = {
    id: uuid(),
    v: ANALYTICS_VERSION,
    event: String(event || "unknown").slice(0, 64),
    ts: new Date().toISOString(),
    session_id: getAnonSessionId(),
    device_id: getAnonDeviceId(),
    path: (window.location.pathname + window.location.search).slice(0, 200),
    view: new URLSearchParams(window.location.search).get("view") || "home",
    props: sanitizeProps(props),
  };
  const q = loadQueue();
  q.push(row);
  saveQueue(q);
  // Fire-and-forget Production sink
  void flushRemote([row]);
  return row;
}

export function trackPageView(view) {
  return track(EV.PAGE_VIEW, { view: view || "home" });
}

export function trackProductSelect(garment, context = {}) {
  return track(EV.PRODUCT_SELECT, { ...productAttrs(garment), ...context });
}

export function trackSearch(filters = {}, meta = {}) {
  return track(EV.SEARCH, {
    gender: filters.gender || null,
    categories: filters.categories || [],
    colours: filters.colours || [],
    styles: filters.styles || [],
    events: filters.events || [],
    parts: filters.parts || [],
    price_bands: filters.priceBands || [],
    countries: filters.countries || [],
    promoted_only: !!filters.promotedOnly,
    has_query: !!(filters.query && String(filters.query).trim()), // never store the query text
    result_count: meta.result_count ?? null,
  });
}

export function trackVwRender({ scene, gender, designerId, garments = [], mode }) {
  return track(EV.VW_RENDER, {
    scene,
    gender,
    designer_id: designerId,
    mode,
    garment_count: garments.length,
    parts: garments.map((g) => g.part).filter(Boolean),
    styles: [...new Set(garments.map((g) => g.style).filter(Boolean))],
    colours: [...new Set(garments.flatMap((g) => g.colours || []))].slice(0, 12),
    price_bands: garments.map((g) => priceBand(g.price_ngn)),
    skus: garments.map((g) => g.id).filter(Boolean).slice(0, 8),
  });
}

export function trackReturnReason({ sku_id, reason, order_id_hash }) {
  const r = RETURN_REASONS.includes(reason) ? reason : "other";
  return track(EV.RETURN_REASON, { sku_id, reason: r, order_id_hash: order_id_hash || null });
}

export function loadAnalyticsEvents({ limit = 500 } = {}) {
  return loadQueue().slice(-limit);
}

export function clearAnalyticsQueue() {
  saveQueue([]);
}

/** Aggregate local queue for admin hyper-granular views. */
export function aggregateFashionAnalytics(events = loadQueue()) {
  const byEvent = {};
  const colourHits = {};
  const styleHits = {};
  const partHits = {};
  const genderHits = {};
  const priceBandHits = {};
  const sceneHits = {};
  const returnMatrix = Object.fromEntries(RETURN_REASONS.map((r) => [r, 0]));
  const viewHits = {};
  const fitSignals = { vw_renders: 0, ai: 0, canvas: 0, shares: 0 };

  for (const e of events) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
    viewHits[e.view || "home"] = (viewHits[e.view || "home"] || 0) + 1;
    const p = e.props || {};

    const bump = (map, key, n = 1) => {
      if (!key) return;
      map[key] = (map[key] || 0) + n;
    };

    if (e.event === EV.PRODUCT_SELECT || e.event === EV.PRODUCT_VIEW || e.event === EV.VW_RENDER) {
      (p.colours || (p.colour ? [p.colour] : [])).forEach((c) => bump(colourHits, c));
      bump(styleHits, p.style);
      (p.styles || []).forEach((s) => bump(styleHits, s));
      bump(partHits, p.part);
      (p.parts || []).forEach((x) => bump(partHits, x));
      bump(genderHits, p.gender);
      bump(priceBandHits, p.price_band);
      (p.price_bands || []).forEach((b) => bump(priceBandHits, b));
    }
    if (e.event === EV.VW_RENDER) {
      fitSignals.vw_renders += 1;
      bump(sceneHits, p.scene);
      if (p.mode === "ai") fitSignals.ai += 1;
      if (p.mode === "canvas") fitSignals.canvas += 1;
    }
    if (e.event === EV.VW_SHARE) fitSignals.shares += 1;
    if (e.event === EV.RETURN_REASON && p.reason) bump(returnMatrix, p.reason);
    if (e.event === EV.SEARCH) {
      (p.colours || []).forEach((c) => bump(colourHits, c));
      (p.styles || []).forEach((s) => bump(styleHits, s));
      bump(genderHits, p.gender);
    }
  }

  const top = (map, n = 8) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ key: k, count: v }));

  return {
    total_events: events.length,
    sessions: new Set(events.map((e) => e.session_id)).size,
    devices: new Set(events.map((e) => e.device_id)).size,
    by_event: byEvent,
    views: top(viewHits, 12),
    /** Hyper-granular product */
    attributes: {
      colours: top(colourHits),
      styles: top(styleHits),
      parts: top(partHits),
      gender: top(genderHits),
      price_bands: top(priceBandHits),
    },
    /** Fit / behaviour */
    fit: { ...fitSignals, scenes: top(sceneHits) },
    /** Return matrix (fills when retail returns ship) */
    return_reason_matrix: returnMatrix,
    recent: events.slice(-40).reverse(),
  };
}

/**
 * Admin filter for insight generation.
 * @param {object} opts
 * @param {string} [opts.brandId] creator_id / designer_id as string or number
 * @param {string[]} [opts.events]
 * @param {string} [opts.gender]
 * @param {string} [opts.view]
 * @param {number} [opts.days]
 * @param {string} [opts.colour]
 * @param {string} [opts.style]
 * @param {string} [opts.part]
 */
export function filterAnalyticsEvents(events = loadQueue(), opts = {}) {
  const days = Number(opts.days) || 0;
  const since = days > 0 ? Date.now() - days * 86400000 : 0;
  const brand = opts.brandId != null && opts.brandId !== "" ? String(opts.brandId) : null;
  const eventSet = opts.events?.length ? new Set(opts.events) : null;

  return (events || []).filter((e) => {
    if (since && new Date(e.ts || e.client_ts || 0).getTime() < since) return false;
    if (eventSet && !eventSet.has(e.event)) return false;
    if (opts.view && e.view !== opts.view) return false;
    const p = e.props || {};
    if (opts.gender && p.gender !== opts.gender) return false;
    if (opts.colour) {
      const cols = p.colours || (p.colour ? [p.colour] : []);
      if (!cols.map(String).includes(String(opts.colour))) return false;
    }
    if (opts.style) {
      const styles = p.styles || (p.style ? [p.style] : []);
      if (!styles.map(String).includes(String(opts.style)) && p.style !== opts.style) return false;
    }
    if (opts.part) {
      const parts = p.parts || (p.part ? [p.part] : []);
      if (!parts.map(String).includes(String(opts.part)) && p.part !== opts.part) return false;
    }
    if (brand) {
      const ids = [
        p.creator_id,
        p.designer_id,
        ...(Array.isArray(p.creator_ids) ? p.creator_ids : []),
      ]
        .filter((x) => x != null)
        .map(String);
      if (!ids.includes(brand)) return false;
    }
    return true;
  });
}

/** Build a brand-scoped insight pack for admin / Orbit export. */
export function buildBrandInsightPack({ brandId, brandName, days = 30, events } = {}) {
  const all = events || loadAnalyticsEvents({ limit: 5000 });
  const filtered = filterAnalyticsEvents(all, { brandId, days });
  const agg = aggregateFashionAnalytics(filtered);
  return {
    portal: "myyanga",
    brand_id: brandId != null ? String(brandId) : null,
    brand_name: brandName || null,
    /** Future Orbit join key — same as creators.id until global Orbit IDs land */
    orbit_brand_key: brandId != null ? `myyanga:creator:${brandId}` : null,
    window_days: days,
    generated_at: new Date().toISOString(),
    anonymized: true,
    metrics: agg,
    event_count: filtered.length,
  };
}

/** Compact context string for AI insight (no PII). */
export function insightContextForAi(pack) {
  const m = pack.metrics || {};
  return JSON.stringify(
    {
      portal: pack.portal,
      brand_id: pack.brand_id,
      brand_name: pack.brand_name,
      orbit_brand_key: pack.orbit_brand_key,
      window_days: pack.window_days,
      event_count: pack.event_count,
      by_event: m.by_event,
      top_colours: m.attributes?.colours,
      top_styles: m.attributes?.styles,
      top_parts: m.attributes?.parts,
      gender: m.attributes?.gender,
      price_bands: m.attributes?.price_bands,
      fit: m.fit,
      return_reason_matrix: m.return_reason_matrix,
      views: m.views,
    },
    null,
    2,
  );
}

async function flushRemote(rows) {
  try {
    const { hasSupabase, supabase } = await import("./supabase.js");
    const { isProduction } = await import("./dataBridge.js");
    if (!hasSupabase || !isProduction()) return;
    await supabase.from("analytics_events").insert(
      rows.map((r) => ({
        event: r.event,
        session_id: r.session_id,
        device_id: r.device_id,
        path: r.path,
        view: r.view,
        props: r.props,
        client_ts: r.ts,
      })),
    );
  } catch {
    /* table missing or RLS — local queue still holds truth for Testing */
  }
}

/**
 * Install global anonymized autocapture (clicks on interactive controls).
 * Returns disposer.
 */
export function installAutocapture() {
  if (typeof document === "undefined") return () => {};
  const onClick = (ev) => {
    const el = ev.target?.closest?.("button, a, [data-track], .thumb, .designer-card, .theme-pane, .chip, .tick-box, .page-link, .gender-btn");
    if (!el) return;
    const tag = el.tagName?.toLowerCase() || "el";
    const label =
      el.getAttribute("data-track") ||
      el.getAttribute("aria-label") ||
      (el.classList.contains("thumb") ? "garment_thumb" : null) ||
      (el.classList.contains("designer-card") ? "designer_card" : null) ||
      (typeof el.textContent === "string" ? el.textContent.trim().slice(0, 48) : tag);
    // Never capture input values
    track(EV.UI_CLICK, {
      tag,
      label: String(label || tag).replace(/\s+/g, " ").slice(0, 48),
      role: el.getAttribute("role") || null,
    });
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
