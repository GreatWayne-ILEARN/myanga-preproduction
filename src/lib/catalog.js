/** Shared catalogue filter options — His/Hers first, then multi-tick params. */

export const GENDER_OPTIONS = [
  { id: "female", label: "Hers" },
  { id: "male", label: "His" },
];

export const CATEGORY_OPTIONS = {
  female: ["Afrocentric", "Corporate", "Casual", "Evening", "Bridals", "Agbada", "Jewellery", "Foot Wear", "Bags", "Fabrics"],
  male: ["Afrocentric", "Corporate", "Casual", "Agbada", "Groom", "Foot Wear", "Accessories", "Fabrics"],
};

export const COUNTRY_OPTIONS = [
  "Nigeria",
  "Ghana",
  "South Africa",
  "Kenya",
  "Senegal",
  "Côte d'Ivoire",
  "UK",
  "USA",
];

export const EVENT_OPTIONS = ["wedding", "corporate", "casual", "traditional", "date", "festival"];
export const STYLE_OPTIONS = ["Agbada", "Kaftan", "Aso-Oke", "Lace", "Ankara", "Senator", "Gown", "Two-piece"];
export const COLOUR_OPTIONS = ["Coral", "Gold", "Emerald", "Navy", "White", "Burgundy", "Royal Blue", "Purple"];
export const PART_OPTIONS = [
  { id: "main_outfit", label: "Outfits" },
  { id: "shoes", label: "Shoes" },
  { id: "bag", label: "Bags" },
  { id: "head_piece", label: "Head pieces" },
  { id: "jewellery", label: "Jewellery" },
];

export const PRICE_BANDS = [
  { id: "0-100000", label: "Under ₦100k", min: 0, max: 100000 },
  { id: "100000-300000", label: "₦100k – ₦300k", min: 100000, max: 300000 },
  { id: "300000-600000", label: "₦300k – ₦600k", min: 300000, max: 600000 },
  { id: "600000-99999999", label: "₦600k+", min: 600000, max: 99999999 },
];

export const EXPLORE_THEMES = [
  { id: "her", label: "HER FASHION", gender: "female", tint: "#3a1a4a", accent: "#c9a227" },
  { id: "his", label: "HIS FASHION", gender: "male", tint: "#0f3d32", accent: "#c9a227" },
  { id: "photo", label: "PHOTOGRAPHY", gender: "", tint: "#1a1a22", accent: "#c9a227", section: "photography" },
  { id: "makeup", label: "MAKE UP", gender: "female", tint: "#4a1848", accent: "#c9a227", section: "makeup" },
  { id: "fabrics", label: "FABRICS", gender: "", tint: "#1e2a1a", accent: "#c9a227", section: "fabrics" },
];

export function emptyMultiFilters() {
  return {
    gender: "",
    categories: [],
    countries: [],
    events: [],
    styles: [],
    colours: [],
    parts: [],
    priceBands: [],
    budgetMin: "",
    budgetMax: "",
    query: "",
    promotedOnly: false,
  };
}

export function toggleIn(arr, value) {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

/** Match a garment against multi-select filters (AND across groups, OR within a group). */
export function matchGarment(g, f) {
  if (!g) return false;
  if (f.gender) {
    if (g.gender && g.gender !== f.gender && g.gender !== "unisex") return false;
  }
  if (f.categories?.length) {
    const cats = g.categories || [];
    if (!f.categories.some((c) => cats.includes(c) || g.style === c || g.part === c)) return false;
  }
  if (f.countries?.length) {
    if (!f.countries.includes(g.country)) return false;
  }
  if (f.events?.length) {
    const tags = g.event_tags || [];
    if (!f.events.some((e) => tags.includes(e))) return false;
  }
  if (f.styles?.length) {
    if (!f.styles.includes(g.style)) return false;
  }
  if (f.colours?.length) {
    const cols = g.colours || [];
    if (!f.colours.some((c) => cols.includes(c))) return false;
  }
  if (f.parts?.length) {
    if (!f.parts.includes(g.part)) return false;
  }
  if (f.priceBands?.length) {
    const bands = PRICE_BANDS.filter((b) => f.priceBands.includes(b.id));
    if (!bands.some((b) => g.price_ngn >= b.min && g.price_ngn <= b.max)) return false;
  }
  const lo = f.budgetMin ? +f.budgetMin : null;
  const hi = f.budgetMax ? +f.budgetMax : null;
  if (lo != null && !Number.isNaN(lo) && g.price_ngn < lo) return false;
  if (hi != null && !Number.isNaN(hi) && g.price_ngn > hi) return false;
  if (f.promotedOnly && !g.is_premium && !g.creator?.is_promoted) return false;
  if (f.query) {
    const needle = String(f.query).toLowerCase();
    const hay = `${g.name} ${g.style || ""} ${g.creator?.name || ""} ${(g.categories || []).join(" ")}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}
