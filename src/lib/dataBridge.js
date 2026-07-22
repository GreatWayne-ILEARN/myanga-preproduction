import { supabase, hasSupabase } from "./supabase.js";
import { MOCK } from "./mockData.js";
import { getEditorial, mapEditorialRow } from "./editorial.js";
import { MOCK_GARMENTS, MOCK_CREATORS, filterMockGarments } from "./mockGarments.js";
import { loadTesterGarments } from "./testStore.js";
import { applyEVetOverrides } from "./eVetStore.js";

/**
 * Testing ⇄ Production bridge.
 * - testing (default): mock assets + localStorage uploads from Admin Studio
 * - production: Supabase (requires env). Falls back to testing data on errors.
 */
const MODE_KEY = "myyanga_app_mode";
let mode = (() => {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "production" && hasSupabase) return "production";
    if (saved === "live" && hasSupabase) return "production"; // legacy
  } catch {}
  return "testing";
})();

const listeners = new Set();

export const getMode = () => mode;
/** @deprecated use isProduction / isTesting */
export const getLegacyMode = () => (mode === "production" ? "live" : "mock");
export const isProduction = () => mode === "production";
export const isTesting = () => mode !== "production";
export const canGoProduction = () => hasSupabase;

export function setMode(m) {
  const next =
    (m === "production" || m === "live") && hasSupabase
      ? "production"
      : "testing";
  mode = next;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
  listeners.forEach((fn) => fn(mode));
}

export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function live(table, mapFallback) {
  if (mode !== "production" || !hasSupabase) return mapFallback();
  try {
    const { data, error } = await supabase.from(table).select("*").limit(60);
    if (error || !data) return mapFallback();
    return data;
  } catch {
    return mapFallback();
  }
}

function testingGarments(brief) {
  const uploaded = loadTesterGarments();
  const merged = [...uploaded, ...MOCK_GARMENTS];
  return brief ? filterMockGarments(merged, brief) : merged;
}

export const Data = {
  editorial: async () =>
    mode === "production"
      ? live("editorial_picks", () => Object.values(MOCK.editorial))
      : Object.values(MOCK.editorial),
  editorialMap: () => MOCK.editorial,
  editorialCarousel: async () => {
    if (mode !== "production" || !hasSupabase) return getEditorial();
    try {
      const { data, error } = await supabase
        .from("editorial_daily")
        .select("*")
        .eq("is_current", true)
        .order("show_on", { ascending: false });
      if (error || !data?.length) return getEditorial();
      return data.map(mapEditorialRow);
    } catch {
      return getEditorial();
    }
  },
  categories: () => MOCK.categories,
  products: async () => live("products", () => MOCK.products),
  discovers: async () => live("discovers", () => MOCK.discovers),
  creators: async () => {
    if (mode !== "production" || !hasSupabase) return applyEVetOverrides(MOCK_CREATORS);
    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("is_active", true)
        .order("is_promoted", { ascending: false })
        .order("credibility_score", { ascending: false })
        .limit(48);
      if (error || !data) throw error;
      return applyEVetOverrides(data);
    } catch {
      return applyEVetOverrides(MOCK_CREATORS);
    }
  },
  garments: async (brief) => {
    if (mode !== "production" || !hasSupabase) return testingGarments(brief);
    try {
      let q = supabase.from("garments").select("*, creator:creators(name)").eq("is_active", true);
      if (brief?.style) q = q.eq("style", brief.style);
      if (brief?.colour) q = q.contains("colours", [brief.colour]);
      if (brief?.event) q = q.contains("event_tags", [brief.event]);
      if (brief?.budget) {
        const [lo, hi] = String(brief.budget).replace(/[^\d-]/g, "").split("-").map(Number);
        if (lo) q = q.gte("price_ngn", lo);
        if (hi) q = q.lte("price_ngn", hi);
      }
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return data?.length ? data : testingGarments(brief);
    } catch {
      return testingGarments(brief);
    }
  },
  pyl: async () => {
    const fallback = () => MOCK.pyl;
    if (mode !== "production" || !hasSupabase) return fallback();
    try {
      const { data, error } = await supabase
        .from("pyl_entries")
        .select("id,user_id,image,votes,caption,status,created_at")
        .eq("status", "live")
        .order("votes", { ascending: false })
        .limit(48);
      if (error || !data) return fallback();
      return data.map((e) => ({
        id: e.id,
        user: (e.user_id || "creator").slice(0, 8),
        votes: e.votes || 0,
        image: e.image,
        caption: e.caption,
        img: e.image ? null : { c1: "#850713", c2: "#222", t: "★" },
      }));
    } catch {
      return fallback();
    }
  },
  premium: async () => live("premium_content", () => MOCK.premium),
  designers: () => MOCK.designers,
  reelConfig: async () =>
    live("reel_config", () => [MOCK.reelConfig]).then((r) => (Array.isArray(r) ? r[0] : r)),
  brandPlacements: async () => live("reel_brand_placements", () => MOCK.brandPlacements),
  analytics: () => MOCK.analytics,
};
