// Editorial features shown in the landing carousel — managed by admin.
// Persists to localStorage in mock mode; editorial_daily table in live mode.
export const EDITORIAL_KINDS = [
  "Outfit of the Day", "Bride of the Week", "Groom of the Week", "Couple of the Week",
  "Photograph of the Week", "Fabric of the Week", "Makeup Artistry of the Week", "Designer in Focus",
];

export const KIND_TO_DB = {
  "Outfit of the Day": "outfit_of_day",
  "Bride of the Week": "bride_of_day",
  "Groom of the Week": "groom_of_week",
  "Couple of the Week": "couple_of_week",
  "Photograph of the Week": "picture_of_day",
  "Fabric of the Week": "look_of_day",
  "Makeup Artistry of the Week": "look_of_day",
  "Designer in Focus": "designer_in_focus",
};

export const DB_TO_KIND = {
  outfit_of_day: "Outfit of the Day",
  bride_of_day: "Bride of the Week",
  groom_of_week: "Groom of the Week",
  couple_of_week: "Couple of the Week",
  picture_of_day: "Photograph of the Week",
  look_of_day: "Fabric of the Week",
  designer_in_focus: "Designer in Focus",
};
const G = [["#850713", "#4a040a"], ["#C9A227", "#8a6f15"], ["#1f2a44", "#0e1422"], ["#7B3F8F", "#43224d"], ["#2E5E4E", "#16302a"], ["#9c5a2d", "#5a3318"], ["#b00043", "#6a0028"], ["#0f6e63", "#073a34"]];
export const DEFAULT_EDITORIAL = EDITORIAL_KINDS.map((kind, i) => ({
  id: i + 1, kind,
  title: ["Aso-Oke Reimagined", "Coral & Lace", "Midnight Agbada", "Twin Flame", "Golden Hour", "Indigo Heritage", "Bridal Glow", "Lisa Folawiyo"][i],
  creator: ["Maki Oh", "Andrea Iyamah", "Mai Atafo", "Tubo", "PaulWilliams.ng", "Asoebi Fabrics NG", "Jogi's Artistry", "Jewel by Lisa"][i],
  description: [
    "A modern take on traditional Aso-Oke — structured shoulders, hand-woven panels, finished with coral beads.",
    "Soft coral lace with a sweetheart neckline and a cathedral veil — styled for a Lagos garden wedding.",
    "Deep navy agbada with tonal embroidery and a fitted senator base — quiet luxury for the groom.",
    "His-and-hers Ankara coordinates in burnt orange — matching without being matchy.",
    "Shot at golden hour on Tarkwa Bay — natural light, editorial framing, full bridal party.",
    "Hand-dyed indigo Adire from Abeokuta artisans — each yard slightly, beautifully different.",
    "Dewy bridal glam with a soft smoky eye and gold inner-corner highlight.",
    "Designer in focus: the house that put Nigerian print on the global runway.",
  ][i],
  image: null, link: "/shop", img: { c1: G[i][0], c2: G[i][1], t: kind[0] },
}));
const KEY = "myyanga_editorial";
export function getEditorial() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s) && s.length) return s; } catch {} return DEFAULT_EDITORIAL; }
export function saveEditorial(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} }

/** Map carousel rows from editorial_daily */
export function mapEditorialRow(row) {
  return {
    id: row.id,
    kind: DB_TO_KIND[row.kind] || row.kind,
    title: row.title,
    creator: row.creator,
    description: row.description,
    image: row.image,
    link: row.link || "/shop",
    img: { c1: "#850713", c2: "#4a040a", t: (row.kind || "E")[0].toUpperCase() },
  };
}
