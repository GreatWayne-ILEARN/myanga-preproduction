/**
 * SVG mock-up garment assets for Testing mode.
 * Seeded African fashion catalogue across designers, parts, countries.
 */
import { matchGarment } from "./catalog.js";

function svgData(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function garmentSvg({ label, c1, c2, shape = "dress", tint = "#0a0a0a" }) {
  const body =
    shape === "agbada"
      ? `<path d="M40 30 L80 30 L110 70 L100 200 L20 200 L10 70 Z" fill="${c1}"/><path d="M40 30 L80 30 L70 55 L50 55 Z" fill="${c2}"/><rect x="48" y="55" width="24" height="90" fill="${c2}" opacity=".35"/>`
      : shape === "shoes"
        ? `<ellipse cx="35" cy="90" rx="28" ry="12" fill="${c1}"/><ellipse cx="85" cy="90" rx="28" ry="12" fill="${c1}"/><path d="M15 90 Q35 60 55 90" fill="${c2}"/><path d="M65 90 Q85 60 105 90" fill="${c2}"/>`
        : shape === "gele"
          ? `<ellipse cx="60" cy="55" rx="48" ry="28" fill="${c1}"/><path d="M20 55 Q60 10 100 55" fill="${c2}"/><circle cx="60" cy="48" r="8" fill="#C9A227"/>`
          : shape === "bag"
            ? `<rect x="30" y="45" width="60" height="70" fill="${c1}"/><path d="M45 45 V30 Q60 15 75 30 V45" stroke="${c2}" stroke-width="6" fill="none"/><circle cx="60" cy="80" r="6" fill="${c2}"/>`
            : shape === "jewellery"
              ? `<circle cx="60" cy="70" r="28" fill="none" stroke="${c1}" stroke-width="8"/><circle cx="60" cy="70" r="18" fill="none" stroke="${c2}" stroke-width="4"/><circle cx="60" cy="42" r="6" fill="#C9A227"/>`
              : shape === "fabric"
                ? `<rect x="12" y="20" width="96" height="160" fill="${c1}"/><path d="M12 40 H108 M12 70 H108 M12 100 H108 M12 130 H108" stroke="${c2}" stroke-width="3" opacity=".55"/><circle cx="40" cy="55" r="8" fill="${c2}" opacity=".7"/><circle cx="80" cy="95" r="10" fill="${c2}" opacity=".55"/>`
                : `<path d="M45 25 L75 25 L95 55 L85 200 L35 200 L25 55 Z" fill="${c1}"/><path d="M45 25 L75 25 L70 50 L50 50 Z" fill="${c2}"/><path d="M40 90 Q60 110 80 90" stroke="${c2}" stroke-width="3" fill="none"/>`;

  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 120 220">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="120" height="220" fill="${tint}"/>
    <rect width="120" height="220" fill="url(#g)" opacity=".22"/>
    ${body}
    <rect width="120" height="220" fill="${tint}" opacity=".28"/>
    <text x="60" y="210" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#f0d9b8">${label}</text>
  </svg>`);
}

function brand(row) {
  return {
    flutterwave_subaccount_id: row.is_e_vetted ? `RS_MOCK_${row.id}` : null,
    paystack_subaccount_code: row.is_e_vetted ? `ACCT_MOCK_${row.id}` : null,
    ...row,
  };
}

const CREATORS = [
  brand({ id: 1, name: "Maki Oh", discipline: "fashion", city: "Lagos", country: "Nigeria", is_promoted: true, is_e_vetted: true, credibility_score: 96, bio: "Contemporary Nigerian womenswear.", whatsapp: "2348010000001", instagram: "https://instagram.com/makioh" }),
  brand({ id: 2, name: "Mai Atafo", discipline: "fashion", city: "Lagos", country: "Nigeria", is_promoted: true, is_e_vetted: true, credibility_score: 94, bio: "Luxury menswear & agbada.", whatsapp: "2348010000002", instagram: "https://instagram.com/maiatafo" }),
  brand({ id: 3, name: "Andrea Iyamah", discipline: "fashion", city: "Lagos", country: "Nigeria", is_promoted: true, is_e_vetted: true, credibility_score: 93, bio: "Resort & bridal silhouettes.", whatsapp: "2348010000003", instagram: "https://instagram.com/andreaiyamah" }),
  brand({ id: 4, name: "Tubo", discipline: "fashion", city: "Lagos", country: "Nigeria", is_promoted: true, is_e_vetted: true, credibility_score: 91, bio: "Statement Ankara and occasion wear.", whatsapp: "2348010000004", instagram: "https://instagram.com/tubo" }),
  brand({ id: 5, name: "Orange Culture", discipline: "fashion", city: "Lagos", country: "Nigeria", is_promoted: false, is_e_vetted: false, credibility_score: 88, bio: "Youthful Afrocentric ready-to-wear.", whatsapp: "2348010000005", instagram: "https://instagram.com/orangeculture" }),
  brand({ id: 6, name: "Emmy Kasbit", discipline: "fashion", city: "Abuja", country: "Nigeria", is_promoted: false, is_e_vetted: false, credibility_score: 86, bio: "Handwoven Akwete craft fashion.", whatsapp: "2348010000006", instagram: "https://instagram.com/emmykasbit" }),
  brand({ id: 7, name: "Christie Brown", discipline: "fashion", city: "Accra", country: "Ghana", is_promoted: true, is_e_vetted: true, credibility_score: 92, bio: "Ghanaian print heritage.", whatsapp: "233201000007", instagram: "https://instagram.com/christiebrown" }),
  brand({ id: 8, name: "Maxhosa Africa", discipline: "fashion", city: "Cape Town", country: "South Africa", is_promoted: true, is_e_vetted: true, credibility_score: 90, bio: "Xhosa-inspired knit luxury.", whatsapp: "27821000008", instagram: "https://instagram.com/maxhosa" }),
];

function g(row) {
  const creator = CREATORS.find((c) => c.id === row.creator_id);
  return {
    ...row,
    country: row.country || creator?.country || "Nigeria",
    is_premium: row.is_premium !== false,
    is_active: true,
    creator: {
      name: creator?.name,
      is_promoted: creator?.is_promoted,
      is_e_vetted: creator?.is_e_vetted,
      country: creator?.country,
    },
  };
}

/** Seed catalogue — multiple looks per designer + shoes/bags separation. */
export const MOCK_GARMENTS = [
  // Mai Atafo — mens
  g({ id: 101, creator_id: 2, name: "Coral Royal Agbada", part: "main_outfit", style: "Agbada", categories: ["Agbada", "Afrocentric", "Groom"], event_tags: ["wedding", "festival", "traditional"], colours: ["Coral", "Gold"], gender: "male", price_ngn: 285000, image: garmentSvg({ label: "Agbada", c1: "#c45c48", c2: "#C9A227", shape: "agbada", tint: "#1a0a08" }) }),
  g({ id: 102, creator_id: 2, name: "Navy Senator Set", part: "main_outfit", style: "Senator", categories: ["Corporate", "Agbada", "Groom"], event_tags: ["corporate", "wedding", "traditional"], colours: ["Navy", "Gold"], gender: "male", price_ngn: 195000, image: garmentSvg({ label: "Senator", c1: "#1f2a44", c2: "#C9A227", shape: "agbada", tint: "#0a1020" }) }),
  g({ id: 113, creator_id: 2, name: "Ivory Damask Agbada", part: "main_outfit", style: "Agbada", categories: ["Agbada", "Groom"], event_tags: ["wedding", "traditional"], colours: ["White", "Gold"], gender: "male", price_ngn: 340000, image: garmentSvg({ label: "Damask", c1: "#f0e6d2", c2: "#C9A227", shape: "agbada", tint: "#1a1510" }) }),
  g({ id: 114, creator_id: 2, name: "Emerald Kaftan Suit", part: "main_outfit", style: "Kaftan", categories: ["Afrocentric", "Casual"], event_tags: ["casual", "festival", "date"], colours: ["Emerald", "Gold"], gender: "male", price_ngn: 165000, image: garmentSvg({ label: "Kaftan", c1: "#0f6e63", c2: "#C9A227", shape: "agbada", tint: "#061812" }) }),
  g({ id: 115, creator_id: 2, name: "Gold Filigree Cap", part: "head_piece", style: "Agbada", categories: ["Accessories", "Groom"], event_tags: ["wedding", "traditional"], colours: ["Gold", "Burgundy"], gender: "male", price_ngn: 38000, image: garmentSvg({ label: "Cap", c1: "#C9A227", c2: "#850713", shape: "gele", tint: "#1a1008" }) }),
  g({ id: 116, creator_id: 2, name: "Leather Captoe Oxfords", part: "shoes", style: "Senator", categories: ["Foot Wear"], event_tags: ["corporate", "wedding"], colours: ["Navy", "Gold"], gender: "male", price_ngn: 95000, image: garmentSvg({ label: "Oxfords", c1: "#1a1a1a", c2: "#C9A227", shape: "shoes", tint: "#0c0c0c" }) }),
  g({ id: 117, creator_id: 2, name: "Embroidered Slippers", part: "shoes", style: "Agbada", categories: ["Foot Wear", "Groom"], event_tags: ["wedding", "traditional", "festival"], colours: ["Gold", "Burgundy"], gender: "male", price_ngn: 52000, image: garmentSvg({ label: "Slippers", c1: "#850713", c2: "#C9A227", shape: "shoes", tint: "#140808" }) }),
  g({ id: 118, creator_id: 2, name: "Structured Brief", part: "bag", style: "Senator", categories: ["Accessories"], event_tags: ["corporate"], colours: ["Navy", "Gold"], gender: "male", price_ngn: 78000, image: garmentSvg({ label: "Brief", c1: "#1f2a44", c2: "#C9A227", shape: "bag", tint: "#0a1020" }) }),

  // Maki Oh — womens
  g({ id: 103, creator_id: 1, name: "Aso-Oke Wrap Gown", part: "main_outfit", style: "Aso-Oke", categories: ["Bridals", "Evening", "Afrocentric"], event_tags: ["wedding", "traditional", "festival"], colours: ["Burgundy", "Gold"], gender: "female", price_ngn: 320000, image: garmentSvg({ label: "Aso-Oke", c1: "#850713", c2: "#C9A227", shape: "dress", tint: "#1a0608" }) }),
  g({ id: 106, creator_id: 1, name: "Emerald Kaftan", part: "main_outfit", style: "Kaftan", categories: ["Casual", "Evening"], event_tags: ["casual", "date", "corporate"], colours: ["Emerald", "Gold"], gender: "female", price_ngn: 98000, image: garmentSvg({ label: "Kaftan", c1: "#0f6e63", c2: "#C9A227", shape: "dress", tint: "#061812" }) }),
  g({ id: 119, creator_id: 1, name: "Indigo Adire Shift", part: "main_outfit", style: "Ankara", categories: ["Afrocentric", "Casual"], event_tags: ["casual", "festival"], colours: ["Navy", "Gold"], gender: "female", price_ngn: 112000, image: garmentSvg({ label: "Adire", c1: "#1a3a6e", c2: "#C9A227", shape: "dress", tint: "#081018" }) }),
  g({ id: 120, creator_id: 1, name: "Coral Cocktail Gown", part: "main_outfit", style: "Gown", categories: ["Evening", "Bridals"], event_tags: ["date", "wedding", "festival"], colours: ["Coral", "Gold"], gender: "female", price_ngn: 275000, image: garmentSvg({ label: "Gown", c1: "#c45c48", c2: "#C9A227", shape: "dress", tint: "#1a0a08" }) }),
  g({ id: 121, creator_id: 1, name: "Woven Aso-Oke Clutch", part: "bag", style: "Aso-Oke", categories: ["Bags"], event_tags: ["wedding", "festival", "date"], colours: ["Burgundy", "Gold"], gender: "female", price_ngn: 58000, image: garmentSvg({ label: "Clutch", c1: "#850713", c2: "#C9A227", shape: "bag", tint: "#140808" }) }),
  g({ id: 122, creator_id: 1, name: "Emerald Block Heels", part: "shoes", style: "Gown", categories: ["Foot Wear"], event_tags: ["evening", "date", "wedding"].filter(Boolean), colours: ["Emerald", "Gold"], gender: "female", price_ngn: 72000, image: garmentSvg({ label: "Heels", c1: "#0f6e63", c2: "#C9A227", shape: "shoes", tint: "#061812" }) }),

  // Andrea Iyamah
  g({ id: 104, creator_id: 3, name: "Lace Bridal Gown", part: "main_outfit", style: "Lace", categories: ["Bridals", "Evening"], event_tags: ["wedding"], colours: ["White", "Coral"], gender: "female", price_ngn: 450000, image: garmentSvg({ label: "Lace", c1: "#f5ebe0", c2: "#c45c48", shape: "dress", tint: "#1a1410" }) }),
  g({ id: 107, creator_id: 3, name: "Coral Gele", part: "head_piece", style: "Aso-Oke", categories: ["Bridals", "Accessories"], event_tags: ["wedding", "festival", "traditional"], colours: ["Coral", "Gold"], gender: "female", price_ngn: 45000, image: garmentSvg({ label: "Gele", c1: "#c45c48", c2: "#C9A227", shape: "gele", tint: "#1a0a08" }) }),
  g({ id: 112, creator_id: 3, name: "Ivory Bridal Heels", part: "shoes", style: "Lace", categories: ["Foot Wear", "Bridals"], event_tags: ["wedding"], colours: ["White", "Gold"], gender: "female", price_ngn: 88000, image: garmentSvg({ label: "Heels", c1: "#f5ebe0", c2: "#C9A227", shape: "shoes", tint: "#14100c" }) }),
  g({ id: 123, creator_id: 3, name: "Resort Two-piece", part: "main_outfit", style: "Two-piece", categories: ["Casual", "Evening"], event_tags: ["casual", "date", "festival"], colours: ["Coral", "White"], gender: "female", price_ngn: 185000, image: garmentSvg({ label: "Resort", c1: "#e8a090", c2: "#ffffff", shape: "dress", tint: "#1a100e" }) }),
  g({ id: 124, creator_id: 3, name: "Pearl Mini Bag", part: "bag", style: "Lace", categories: ["Bags", "Bridals"], event_tags: ["wedding", "date"], colours: ["White", "Gold"], gender: "female", price_ngn: 64000, image: garmentSvg({ label: "Mini", c1: "#f5ebe0", c2: "#C9A227", shape: "bag", tint: "#14100c" }) }),

  // Tubo
  g({ id: 105, creator_id: 4, name: "Ankara Two-piece", part: "main_outfit", style: "Two-piece", categories: ["Afrocentric", "Casual", "Evening"], event_tags: ["casual", "festival", "date"], colours: ["Emerald", "Gold"], gender: "female", price_ngn: 125000, image: garmentSvg({ label: "Ankara", c1: "#2E5E4E", c2: "#C9A227", shape: "dress", tint: "#0a1812" }) }),
  g({ id: 110, creator_id: 4, name: "Gold Statement Clutch", part: "bag", style: "Gown", categories: ["Bags"], event_tags: ["wedding", "date", "festival"], colours: ["Gold", "Burgundy"], gender: "female", price_ngn: 65000, image: garmentSvg({ label: "Clutch", c1: "#C9A227", c2: "#850713", shape: "bag", tint: "#1a1408" }) }),
  g({ id: 125, creator_id: 4, name: "Purple Owambe Gown", part: "main_outfit", style: "Gown", categories: ["Evening", "Afrocentric"], event_tags: ["festival", "wedding"], colours: ["Purple", "Gold"], gender: "female", price_ngn: 210000, image: garmentSvg({ label: "Owambe", c1: "#5b2a7a", c2: "#C9A227", shape: "dress", tint: "#140818" }) }),
  g({ id: 126, creator_id: 4, name: "Printed Slide Sandals", part: "shoes", style: "Ankara", categories: ["Foot Wear"], event_tags: ["casual", "festival"], colours: ["Emerald", "Gold"], gender: "female", price_ngn: 38000, image: garmentSvg({ label: "Slides", c1: "#2E5E4E", c2: "#C9A227", shape: "shoes", tint: "#0a1812" }) }),

  // Orange Culture
  g({ id: 108, creator_id: 5, name: "Royal Blue Cap", part: "head_piece", style: "Senator", categories: ["Accessories"], event_tags: ["wedding", "corporate", "traditional"], colours: ["Royal Blue", "Gold"], gender: "male", price_ngn: 28000, image: garmentSvg({ label: "Cap", c1: "#1a4b8c", c2: "#C9A227", shape: "gele", tint: "#081018" }) }),
  g({ id: 111, creator_id: 5, name: "Street Ankara Bomber", part: "main_outfit", style: "Ankara", categories: ["Casual", "Afrocentric"], event_tags: ["casual", "festival"], colours: ["Gold", "Navy"], gender: "unisex", price_ngn: 89000, image: garmentSvg({ label: "Bomber", c1: "#C9A227", c2: "#1f2a44", shape: "dress", tint: "#121008" }) }),
  g({ id: 127, creator_id: 5, name: "Chunky Print Sneakers", part: "shoes", style: "Ankara", categories: ["Foot Wear"], event_tags: ["casual", "festival"], colours: ["Gold", "Navy"], gender: "unisex", price_ngn: 56000, image: garmentSvg({ label: "Sneakers", c1: "#1f2a44", c2: "#C9A227", shape: "shoes", tint: "#0a0c12" }) }),
  g({ id: 128, creator_id: 5, name: "Crossbody Print Pack", part: "bag", style: "Ankara", categories: ["Bags", "Accessories"], event_tags: ["casual", "festival"], colours: ["Navy", "Gold"], gender: "unisex", price_ngn: 42000, image: garmentSvg({ label: "Pack", c1: "#1f2a44", c2: "#C9A227", shape: "bag", tint: "#0a0c12" }) }),

  // Emmy Kasbit + fabrics
  g({ id: 109, creator_id: 6, name: "Beaded Coral Necklace", part: "jewellery", style: "Gown", categories: ["Jewellery"], event_tags: ["wedding", "traditional", "festival"], colours: ["Coral", "Gold"], gender: "female", price_ngn: 75000, image: garmentSvg({ label: "Beads", c1: "#c45c48", c2: "#C9A227", shape: "jewellery", tint: "#1a0a08" }) }),
  g({ id: 129, creator_id: 6, name: "Akwete Boubou", part: "main_outfit", style: "Kaftan", categories: ["Afrocentric", "Fabrics"], event_tags: ["traditional", "festival"], colours: ["Gold", "Burgundy"], gender: "unisex", price_ngn: 148000, image: garmentSvg({ label: "Akwete", c1: "#9c5a2d", c2: "#C9A227", shape: "dress", tint: "#1a1008" }) }),
  g({ id: 130, creator_id: 6, name: "Handwoven Akwete Yardage", part: "main_outfit", style: "Aso-Oke", categories: ["Fabrics"], event_tags: ["traditional", "wedding"], colours: ["Gold", "Burgundy"], gender: "unisex", price_ngn: 95000, image: garmentSvg({ label: "Yardage", c1: "#7a3e18", c2: "#C9A227", shape: "fabric", tint: "#120c08" }) }),

  // Christie Brown (Ghana)
  g({ id: 131, creator_id: 7, name: "Kente Panel Dress", part: "main_outfit", style: "Gown", categories: ["Afrocentric", "Evening"], event_tags: ["festival", "wedding", "traditional"], colours: ["Gold", "Emerald"], gender: "female", price_ngn: 230000, country: "Ghana", image: garmentSvg({ label: "Kente", c1: "#C9A227", c2: "#0f6e63", shape: "dress", tint: "#141008" }) }),
  g({ id: 132, creator_id: 7, name: "Kente Envelope Bag", part: "bag", style: "Gown", categories: ["Bags"], event_tags: ["festival", "wedding"], colours: ["Gold", "Emerald"], gender: "female", price_ngn: 48000, country: "Ghana", image: garmentSvg({ label: "Envelope", c1: "#C9A227", c2: "#0f6e63", shape: "bag", tint: "#141008" }) }),
  g({ id: 133, creator_id: 7, name: "Woven Flat Sandals", part: "shoes", style: "Gown", categories: ["Foot Wear"], event_tags: ["festival", "casual"], colours: ["Gold", "Coral"], gender: "female", price_ngn: 41000, country: "Ghana", image: garmentSvg({ label: "Flats", c1: "#C9A227", c2: "#c45c48", shape: "shoes", tint: "#141008" }) }),

  // Maxhosa (SA)
  g({ id: 134, creator_id: 8, name: "Xhosa Knit Coat", part: "main_outfit", style: "Kaftan", categories: ["Afrocentric", "Corporate"], event_tags: ["corporate", "casual"], colours: ["Navy", "Gold"], gender: "unisex", price_ngn: 310000, country: "South Africa", image: garmentSvg({ label: "Knit", c1: "#1f2a44", c2: "#C9A227", shape: "agbada", tint: "#0a0c12" }) }),
  g({ id: 135, creator_id: 8, name: "Geometry Crossbody", part: "bag", style: "Kaftan", categories: ["Bags", "Accessories"], event_tags: ["corporate", "casual"], colours: ["Navy", "Gold"], gender: "unisex", price_ngn: 87000, country: "South Africa", image: garmentSvg({ label: "Geo", c1: "#1f2a44", c2: "#C9A227", shape: "bag", tint: "#0a0c12" }) }),
].map((row) => {
  // fix accidental event tag for emerald heels
  if (row.id === 122) row.event_tags = ["date", "wedding", "festival"];
  return row;
});

export const MOCK_CREATORS = CREATORS;

/** Filter mock garments — supports legacy single fields + multi-select arrays. */
export function filterMockGarments(list, brief = {}) {
  const multi = {
    gender: brief.gender || "",
    categories: brief.categories || (brief.category ? [brief.category] : []),
    countries: brief.countries || (brief.country ? [brief.country] : []),
    events: brief.events || (brief.event ? [brief.event] : []),
    styles: brief.styles || (brief.style ? [brief.style] : []),
    colours: brief.colours || (brief.colour ? [brief.colour] : []),
    parts: brief.parts || (brief.part ? [brief.part] : []),
    priceBands: brief.priceBands || [],
    budgetMin: brief.budgetMin || "",
    budgetMax: brief.budgetMax || "",
    query: brief.query || "",
    promotedOnly: !!brief.promotedOnly,
  };
  if (brief.budget && !multi.budgetMin && !multi.budgetMax && !multi.priceBands.length) {
    const [lo, hi] = String(brief.budget).replace(/[^\d-]/g, "").split("-").map(Number);
    if (lo) multi.budgetMin = String(lo);
    if (hi) multi.budgetMax = String(hi);
  }
  return list.filter((g) => matchGarment(g, multi));
}
