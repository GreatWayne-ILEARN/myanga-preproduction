/**
 * MyYanga Blog — fashion & creative-economy stories.
 * Testing: seeded posts with SVG thumbnails. Production: merge with discovers / blog_posts when available.
 */

function svgData(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function storyThumb({ label, c1, c2, motif = "runway" }) {
  const art =
    motif === "indigo"
      ? `<rect x="18" y="28" width="204" height="120" fill="${c1}"/><path d="M18 48 H222 M18 78 H222 M18 108 H222" stroke="${c2}" stroke-width="4" opacity=".55"/><circle cx="70" cy="70" r="14" fill="${c2}" opacity=".65"/><circle cx="160" cy="100" r="18" fill="${c2}" opacity=".45"/>`
      : motif === "gele"
        ? `<ellipse cx="120" cy="88" rx="78" ry="42" fill="${c1}"/><path d="M50 88 Q120 28 190 88" fill="${c2}"/><circle cx="120" cy="78" r="10" fill="#C9A227"/>`
        : motif === "studio"
          ? `<rect x="40" y="36" width="100" height="130" fill="${c1}"/><rect x="150" y="56" width="50" height="90" fill="${c2}"/><circle cx="90" cy="70" r="18" fill="#F5F0E8" opacity=".35"/>`
          : motif === "market"
            ? `<path d="M30 140 L60 50 L100 140 Z" fill="${c1}"/><path d="M90 140 L130 40 L170 140 Z" fill="${c2}"/><path d="M150 140 L190 60 L220 140 Z" fill="${c1}" opacity=".85"/><rect x="20" y="140" width="200" height="12" fill="#C9A227"/>`
            : motif === "lens"
              ? `<circle cx="120" cy="95" r="52" fill="none" stroke="${c1}" stroke-width="14"/><circle cx="120" cy="95" r="28" fill="${c2}"/><circle cx="120" cy="95" r="10" fill="#F5F0E8"/>`
              : `<path d="M40 150 L70 40 L110 150 Z" fill="${c1}"/><path d="M100 150 L140 55 L180 150 Z" fill="${c2}"/><rect x="30" y="150" width="180" height="8" fill="#C9A227"/><text x="120" y="175" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#f0d9b8">LFW</text>`;

  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 240 200">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="240" height="200" fill="#1a0a08"/>
    <rect width="240" height="200" fill="url(#bg)" opacity=".35"/>
    ${art}
    <rect width="240" height="200" fill="#1a0a08" opacity=".2"/>
    <text x="120" y="192" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="#f0d9b8">${label}</text>
  </svg>`);
}

/** Seeded editorial stories — fashion & creative economies across Africa + diaspora. */
export const BLOG_POSTS = [
  {
    id: 1,
    slug: "lagos-fashion-week-creative-economy",
    title: "Lagos Fashion Week and the Creative Economy Bet",
    excerpt:
      "Runway heat is only half the story. Behind LFW, designers, fabric houses and photographers are building export-ready businesses — and platforms that keep patronage local.",
    category: "Trending",
    author: "MyYanga Editorial",
    published_at: "2026-07-12T09:00:00.000Z",
    trending: true,
    thumb: storyThumb({ label: "Lagos FW", c1: "#850713", c2: "#C9A227", motif: "runway" }),
    body: [
      "Lagos Fashion Week has always been a spectacle — coral aso-oke under stage lights, senator cuts walking like boardroom armour, bridal houses packing the front row. What has changed is the business conversation happening off-runway.",
      "Designers are no longer treating the week as a one-off lookbook drop. They are using it to close fabric suppliers, lock diaspora wholesale, and prove credibility for e-commerce rails that settle money to the brand — not a middleman holding the bag.",
      "That is the creative-economy shift MyYanga is built for: discovery that leads to engagement, then direct patronage. Virtual Wear lets a buyer see themselves in a promoted look before they message WhatsApp or add an e-vetted piece to bag.",
      "The brands that win the next decade will treat runway as marketing, and trust infrastructure — vetting, transparent splits, scheduled reels — as the product.",
    ],
  },
  {
    id: 2,
    slug: "gele-as-soft-power",
    title: "Gele as Soft Power: Headwrap Craft Meets Global Demand",
    excerpt:
      "From owambe halls to London weddings, gele artisans are pricing craft like couture. Here is how creative economies turn cultural skill into exportable value.",
    category: "Craft",
    author: "MyYanga Editorial",
    published_at: "2026-07-08T11:00:00.000Z",
    trending: true,
    thumb: storyThumb({ label: "Gele", c1: "#B8893A", c2: "#6e521f", motif: "gele" }),
    body: [
      "A well-tied gele is architecture on the head — volume, balance, and a colour story that has to survive humidity, dancing, and the photographer’s flash.",
      "Artisans who once worked only on family referrals are now booking diaspora brides months ahead. Pricing has moved from “favour” to studio rate cards, with deposits and look packages.",
      "Platforms that treat gele makers as creatives — not anonymous service workers — help patrons find them, rate credibility, and share the finished look with friends who then ask: where did you get that?",
      "Soft power is not a slogan. It is a paid booking, a shared look link, and a repeat client in Accra or Atlanta who still wants the craft done the Lagos way.",
    ],
  },
  {
    id: 3,
    slug: "adire-indigo-makers",
    title: "Indigo Capital: Sustainable Adire Makers Scaling Quietly",
    excerpt:
      "Adire yards are becoming inventory strategies. Meet the makers dyeing for brands that need traceable cloth without killing the handcraft.",
    category: "Fabrics",
    author: "MyYanga Editorial",
    published_at: "2026-07-04T08:30:00.000Z",
    trending: true,
    thumb: storyThumb({ label: "Adire", c1: "#2E5E4E", c2: "#16302a", motif: "indigo" }),
    body: [
      "Adire’s indigo baths are slow on purpose. That slowness used to be a production liability. Now it is a brand asset — if the maker can document batches and deliver on calendar.",
      "Creative-economy operators are pairing dye houses with designers who need consistent metreage for ready-to-wear, not only one-off bridal commissions.",
      "Sustainability claims only stick when patrons can see the maker, the process, and a path to buy. Discover pools and editorial stories pull attention; shop and WhatsApp close the loop.",
      "MyYanga’s job is not to replace the dye pit. It is to make sure the next buyer finds the right yard before they settle for a print that only looks like adire.",
    ],
  },
  {
    id: 4,
    slug: "photographers-fuel-fashion-trust",
    title: "Photographers Are the Trust Layer Fashion Forgot",
    excerpt:
      "A look sells when the image feels true. African fashion photographers are the invisible infrastructure behind brand credibility and Virtual Wear confidence.",
    category: "Photography",
    author: "MyYanga Editorial",
    published_at: "2026-06-28T10:00:00.000Z",
    trending: false,
    thumb: storyThumb({ label: "Lens", c1: "#1f2a44", c2: "#0e1422", motif: "lens" }),
    body: [
      "Shoppers decide in seconds. Lighting, skin tone accuracy, fabric texture — photographers carry more conversion weight than most lookbooks admit.",
      "When brands pay into Discover and Virtual Wear promotion, the pool only works if the garment assets feel like real clothes on real bodies, not stock composites.",
      "Creative economies grow when photographers are booked as partners: credit lines, patronage links, and shared stories that send traffic back to the platform.",
      "Comment threads on shared looks and blog articles are not noise. They are social proof that the creative ecosystem is alive.",
    ],
  },
  {
    id: 5,
    slug: "accra-to-abuja-market-circuits",
    title: "Accra–Abuja Market Circuits: Where Fabric Money Moves",
    excerpt:
      "Creative economies are logistics stories. Follow the fabric routes connecting Ghanaian print houses, Abuja bridal demand, and diaspora restock cycles.",
    category: "Markets",
    author: "MyYanga Editorial",
    published_at: "2026-06-20T14:00:00.000Z",
    trending: true,
    thumb: storyThumb({ label: "Markets", c1: "#9c5a2d", c2: "#5a3318", motif: "market" }),
    body: [
      "A metre of quality print may start in Accra, get cut in Lagos, and ship to a bride fitting in Abuja — with the invoice settled on a phone chat.",
      "That informality built the industry. Scale now asks for clearer rails: e-vetted brands, gateway splits that pay designers immediately, and member schedules that deliver reels when people actually shop.",
      "Blog stories that map these circuits do more than educate. They recruit new patrons who arrive curious and leave with a Virtual Wear try or a bag checkout.",
      "Explore MyYanga after you read — the market is already here; the portal just makes it one spot.",
    ],
  },
  {
    id: 6,
    slug: "studio-economy-makeup-bridal",
    title: "The Studio Economy: Makeup Artists Pricing Like Brands",
    excerpt:
      "Bridal glam teams are productising kits, retainers and content rights. Creative economies reward studios that treat beauty as IP — not only a chair hour.",
    category: "Beauty",
    author: "MyYanga Editorial",
    published_at: "2026-06-14T09:00:00.000Z",
    trending: false,
    thumb: storyThumb({ label: "Studio", c1: "#7B3F8F", c2: "#43224d", motif: "studio" }),
    body: [
      "The best makeup artists already operate like mini-brands: moodboards, deposit policies, assistant teams, and a feed that sells the next booking.",
      "What they often lack is a fashion-native portal where lovers of African style discover them beside designers and fabric makers — equal actions, equal credibility signals.",
      "When a bridal story trends on the blog, the CTA is not ‘follow us somewhere else’. It is Explore MyYanga: try a look, follow a reel schedule, patronise the creative.",
      "That acquisition loop — story → comment → share → home — is how editorial becomes growth without cheapening the craft.",
    ],
  },
];

export function listBlogPosts({ trendingFirst = true } = {}) {
  const list = [...BLOG_POSTS].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  if (!trendingFirst) return list;
  return [...list.filter((p) => p.trending), ...list.filter((p) => !p.trending)];
}

export function trendingBlogPosts(limit = 3) {
  return listBlogPosts({ trendingFirst: true })
    .filter((p) => p.trending)
    .slice(0, limit);
}

export function getBlogPostBySlug(slug) {
  if (!slug) return null;
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}

export function blogArticleUrl(slug) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/?view=article&slug=${encodeURIComponent(slug)}`;
}

export async function shareBlogArticle(post) {
  const url = blogArticleUrl(post.slug);
  const payload = {
    title: post.title,
    text: post.excerpt,
    url,
  };
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(payload);
      return { ok: true, method: "native" };
    }
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, method: "cancelled" };
  }
  return { ok: false, method: "fallback", url };
}
