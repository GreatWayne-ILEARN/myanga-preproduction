/**
 * Virtual Wear paid brand pool — randomized outfits.
 * Brands in the pool = creators.is_promoted (paid promotion / VW seat).
 * Event theme + outfit type (style) are required match dimensions.
 * Outfits already rendered for this device/user are never repeated until the pool resets.
 */
import { getAnonDeviceId } from "./analytics.js";

const WORN_KEY = "myyanga_vw_worn_outfits";

/** Map VW scene → garment event_tags */
export const SCENE_TO_EVENT = {
  wedding: "wedding",
  corporate: "corporate",
  festival: "festival",
  date: "date",
  traditional: "traditional",
  casual: "casual",
  plain: null, // any event
};

export const VW_EVENT_SCENES = [
  { id: "wedding", label: "Wedding", event: "wedding" },
  { id: "festival", label: "Owambe / Festival", event: "festival" },
  { id: "corporate", label: "Corporate", event: "corporate" },
  { id: "traditional", label: "Traditional", event: "traditional" },
  { id: "date", label: "Date / Evening", event: "date" },
  { id: "casual", label: "Casual", event: "casual" },
];

function loadWorn() {
  try {
    return JSON.parse(localStorage.getItem(WORN_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveWorn(map) {
  try {
    localStorage.setItem(WORN_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function wearerKey() {
  return getAnonDeviceId();
}

/** Outfit ids this wearer has already been rendered in. */
export function getWornOutfitIds() {
  const map = loadWorn();
  const row = map[wearerKey()] || { ids: [] };
  return new Set((row.ids || []).map(String));
}

export function markOutfitWorn(outfitId) {
  if (outfitId == null) return;
  const map = loadWorn();
  const k = wearerKey();
  const row = map[k] || { ids: [], at: {} };
  const id = String(outfitId);
  if (!row.ids.includes(id)) row.ids.push(id);
  row.at[id] = new Date().toISOString();
  // Cap history so localStorage stays small
  if (row.ids.length > 200) row.ids = row.ids.slice(-200);
  map[k] = row;
  saveWorn(map);
}

export function clearWornOutfits() {
  const map = loadWorn();
  delete map[wearerKey()];
  saveWorn(map);
}

/** Creators who paid into the Virtual Wear rotation pool. */
export function paidVwBrandIds(creators = []) {
  return new Set(
    (creators || [])
      .filter((c) => c.is_promoted || c.vw_pool_active)
      .map((c) => c.id),
  );
}

/**
 * Eligible main_outfit SKUs from the paid VW pool.
 * @param {object} opts
 * @param {array} opts.garments
 * @param {array} opts.creators
 * @param {string} opts.gender male|female
 * @param {string} opts.scene wedding|festival|…
 * @param {string} opts.style Agbada|Gown|… outfit type
 * @param {boolean} [opts.ignoreWorn] when pool exhausted, allow redraw
 */
export function eligibleVwOutfits({ garments, creators, gender, scene, style, ignoreWorn = false }) {
  const brandIds = paidVwBrandIds(creators);
  const worn = ignoreWorn ? new Set() : getWornOutfitIds();
  const event = SCENE_TO_EVENT[scene] ?? scene;

  return (garments || []).filter((g) => {
    if (!g || g.part !== "main_outfit") return false;
    if (!brandIds.has(g.creator_id)) return false;
    if (worn.has(String(g.id))) return false;
    if (gender) {
      if (g.gender && g.gender !== gender && g.gender !== "unisex") return false;
    }
    if (style && g.style && g.style !== style) return false;
    if (event) {
      const tags = g.event_tags || [];
      if (tags.length && !tags.includes(event)) return false;
    }
    return true;
  });
}

/** Fisher–Yates pick one. */
export function pickRandom(list) {
  if (!list?.length) return null;
  const i = Math.floor(Math.random() * list.length);
  return list[i];
}

/**
 * Pick next outfit for render. If all matching outfits are worn, resets worn
 * for this filter slice only by ignoring worn once (pool recycle).
 */
export function pickNextVwOutfit(opts) {
  let pool = eligibleVwOutfits(opts);
  let recycled = false;
  if (!pool.length) {
    pool = eligibleVwOutfits({ ...opts, ignoreWorn: true });
    recycled = pool.length > 0;
  }
  const outfit = pickRandom(pool);
  return { outfit, poolSize: pool.length, recycled };
}

/** Same-brand accessory: shoes or bag matching gender (optional event). */
export function pickAccessory(garments, { creatorId, gender, part, scene }) {
  const event = SCENE_TO_EVENT[scene] ?? scene;
  const candidates = (garments || []).filter((g) => {
    if (g.creator_id !== creatorId) return false;
    if (g.part !== part) return false;
    if (gender && g.gender && g.gender !== gender && g.gender !== "unisex") return false;
    if (event && g.event_tags?.length && !g.event_tags.includes(event)) return false;
    return true;
  });
  return pickRandom(candidates);
}

export function assembleRotatedLook({ garments, creators, gender, scene, style }) {
  const { outfit, poolSize, recycled } = pickNextVwOutfit({ garments, creators, gender, scene, style });
  if (!outfit) {
    return { ok: false, reason: "empty_pool", poolSize: 0 };
  }
  const shoe = pickAccessory(garments, { creatorId: outfit.creator_id, gender, part: "shoes", scene });
  const bag = pickAccessory(garments, { creatorId: outfit.creator_id, gender, part: "bag", scene });
  const items = [outfit, shoe, bag].filter(Boolean);
  const brand = (creators || []).find((c) => c.id === outfit.creator_id);
  return {
    ok: true,
    outfit,
    shoe,
    bag,
    items,
    brand,
    poolSize,
    recycled,
  };
}
