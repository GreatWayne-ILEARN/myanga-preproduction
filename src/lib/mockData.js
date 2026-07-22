// Mock content for every section — powers MOCK mode (no DB needed).
const img = (c1, c2, t) => ({ c1, c2, t });

export const MOCK = {
  editorial: {
    outfit_of_day: { title: "Aso-Oke Reimagined", brand: "Maki Oh", img: img("#850713", "#4a040a", "AO"), date: "Today" },
    bride_of_week: { title: "Coral & Lace", brand: "Andrea Iyamah", img: img("#B8893A", "#6e521f", "BR"), date: "This week" },
    groom_of_week: { title: "Midnight Agbada", brand: "Mai Atafo", img: img("#1f2a44", "#0e1422", "GR"), date: "This week" },
    couple_of_week: { title: "Twin Flame", brand: "Tubo", img: img("#2E5E4E", "#16302a", "CP"), date: "This week" },
    designer_in_focus: { title: "Lisa Folawiyo", brand: "Jewel by Lisa", img: img("#7B3F8F", "#43224d", "LF"), date: "Featured" },
  },
  categories: {
    "HER FASHION": ["Afrocentric", "Corporate", "Casual", "Evening", "Bridals", "Agbada", "Jewellery", "Foot Wear", "Bags", "Fabrics"],
    "HIS FASHION": ["Afrocentric", "Corporate", "Casual", "Agbada", "Groom", "Foot Wear", "Accessories", "Fabrics"],
    "PHOTOGRAPHY": ["Wedding", "Fashion", "Portrait", "Creative", "Birthday"],
    "MAKE UP": ["Bridal", "Day Time", "Night Time", "Henna", "Runway"],
    "FABRICS": ["Aso-Oke", "Adire", "Akwete", "Embellished"],
  },
  products: Array.from({ length: 18 }).map((_, i) => {
    const pals = [["#850713", "#4a040a"], ["#B8893A", "#6e521f"], ["#2E5E4E", "#16302a"], ["#7B3F8F", "#43224d"], ["#1f2a44", "#0e1422"], ["#9c5a2d", "#5a3318"]];
    const brands = ["Maki Oh", "Mai Atafo", "Andrea Iyamah", "Tubo", "Orange Culture", "Emmy Kasbit"];
    const names = ["Adire Wrap Dress", "Agbada Set", "Aso-Oke Gele", "Lace Kaftan", "Ankara Blazer", "Beaded Clutch", "Coral Necklace", "Senator Suit", "Bridal Veil", "Damask Boubou"];
    return {
      id: i + 1, name: names[i % names.length] + " " + (i + 1),
      brand: brands[i % brands.length], price: 25000 + (i % 12) * 8500,
      category: ["Bridals", "Agbada", "Casual", "Evening", "Corporate"][i % 5],
      img: img(pals[i % pals.length][0], pals[i % pals.length][1], names[i % names.length][0]),
    };
  }),
  discovers: [
    { id: 1, title: "Lagos Fashion Week Recap", excerpt: "The standout collections from the runway.", img: img("#850713", "#4a040a", "LF") },
    { id: 2, title: "How to Tie Gele 5 Ways", excerpt: "A step-by-step for the perfect headwrap.", img: img("#B8893A", "#6e521f", "GE") },
    { id: 3, title: "Sustainable Adire Makers", excerpt: "Meet the artisans behind the indigo.", img: img("#2E5E4E", "#16302a", "AD") },
  ],
  pyl: Array.from({ length: 18 }).map((_, i) => ({
    id: i + 1,
    user: ["Ada", "Zainab", "Chidi", "Bisi", "Femi", "Ngozi", "Kemi", "Tunde", "Amara", "Ife", "Sade", "Obi"][i % 12],
    votes: 40 - i * 2,
    caption: ["Owambe coral", "Senator Sunday", "Bridal glow", "Ankara brunch", "Aso-Oke night"][i % 5],
    img: img(["#850713", "#7B3F8F", "#2E5E4E", "#1f2a44"][i % 4], "#222", "★"),
  })),
  premium: [
    { id: 1, title: "Stylist Masterclass", tier: "Premium", img: img("#850713", "#4a040a", "PM") },
    { id: 2, title: "Designer Price Lists", tier: "Premium", img: img("#B8893A", "#6e521f", "PL") },
  ],
  designers: ["Maki Oh", "Mai Atafo", "Andrea Iyamah", "Tubo", "Orange Culture", "Emmy Kasbit", "Lisa Folawiyo", "Deola Sagoe"],
  reelConfig: {
    delivery_mode: "email", images_per_reel: 10, max_brand_slots_per_reel: 3,
    all_users_eligible: true, send_frequency: "weekly", whatsapp_api_key: "", vapid_public_key: "",
  },
  brandPlacements: [
    { id: 1, brand: "Maki Oh", caption: "New bridal drop", impressions_purchased: 1000, impressions_delivered: 240, priority: 1, is_active: true },
    { id: 2, brand: "Tubo", caption: "Owambe edit", impressions_purchased: 500, impressions_delivered: 500, priority: 2, is_active: false },
  ],
  analytics: {
    kpis: [
      { label: "Users", value: "12,480" }, { label: "Active brands", value: "318" }, { label: "Products", value: "5,742" },
      { label: "Orders (30d)", value: "1,206" }, { label: "GMV (30d)", value: "₦48.2M" }, { label: "Premium subs", value: "934" },
      { label: "PYL entries", value: "2,115" }, { label: "Reels sent (7d)", value: "9,860" }, { label: "Reel CTR", value: "6.4%" },
    ],
  },
};
