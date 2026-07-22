/**
 * Studio-editable page-break sizes (items shown before ‹ 1 2 3 ›).
 * Persisted in localStorage for Testing; ready to map to site_settings later.
 */
const KEY = "myyanga_pager_settings";

export const PAGER_DEFAULTS = {
  shop: 12,
  shop_products: 12,
  smart_decks: 4,
  smart_outfits: 8,
  smart_shoes: 8,
  smart_bags: 8,
  discover_creators: 6,
  discover_stories: 6,
  pyl: 8,
};

export const PAGER_FIELDS = [
  { id: "shop", label: "Shop — catalogue grid", hint: "Garments per page (live site uses ~12)" },
  { id: "shop_products", label: "Shop — product cards", hint: "Legacy product cards per page" },
  { id: "smart_decks", label: "Smart Search — look decks", hint: "Complete-look decks per page" },
  { id: "smart_outfits", label: "Smart Search — outfits", hint: "Outfit cards per page" },
  { id: "smart_shoes", label: "Smart Search — shoes", hint: "Shoe cards per page" },
  { id: "smart_bags", label: "Smart Search — bags", hint: "Bag cards per page" },
  { id: "discover_creators", label: "Discover — creators", hint: "Creator cards per page" },
  { id: "discover_stories", label: "Discover — stories", hint: "Editorial cards per page" },
  { id: "pyl", label: "Post Your Look", hint: "Competition entries per page" },
];

const listeners = new Set();

function clamp(n, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(48, Math.max(1, Math.round(v)));
}

export function loadPagerSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...PAGER_DEFAULTS };
    const next = { ...PAGER_DEFAULTS };
    for (const k of Object.keys(PAGER_DEFAULTS)) {
      if (raw[k] != null) next[k] = clamp(raw[k], PAGER_DEFAULTS[k]);
    }
    return next;
  } catch {
    return { ...PAGER_DEFAULTS };
  }
}

export function savePagerSettings(partial) {
  const cur = loadPagerSettings();
  const next = { ...cur };
  for (const [k, v] of Object.entries(partial || {})) {
    if (k in PAGER_DEFAULTS) next[k] = clamp(v, PAGER_DEFAULTS[k]);
  }
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn(next));
  return next;
}

export function resetPagerSettings() {
  localStorage.removeItem(KEY);
  const next = { ...PAGER_DEFAULTS };
  listeners.forEach((fn) => fn(next));
  return next;
}

export function getPerPage(key) {
  const s = loadPagerSettings();
  return s[key] ?? PAGER_DEFAULTS[key] ?? 12;
}

/** Subscribe to studio edits so live pages update without reload. */
export function onPagerSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
