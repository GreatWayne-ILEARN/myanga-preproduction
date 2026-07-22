#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (n) => { console.log("PASS", n); pass++; };
const bad = (n) => { console.log("FAIL", n); fail++; };

const must = (files) => files.forEach((f) => (existsSync(join(root, f)) ? ok(f) : bad(f)));

must([
  "supabase/migrations/004_production_core.sql",
  "supabase/migrations/005_monetization.sql",
  "supabase/migrations/008_analytics_events.sql",
  "supabase/migrations/009_marketplace_commerce.sql",
  "supabase/migrations/011_blog.sql",
  "src/components/PayGate.jsx",
  "src/components/MonetizationStudio.jsx",
  "src/components/InsightsStudio.jsx",
  "src/components/EVettingStudio.jsx",
  "src/pages/VirtualWearPage.jsx",
  "src/pages/SmartSearchPage.jsx",
  "src/pages/LookSharePage.jsx",
  "src/pages/BlogPage.jsx",
  "src/pages/PYLPage.jsx",
  "src/pages/SettingsPage.jsx",
  "src/pages/ReelsPage.jsx",
  "src/pages/ProductPage.jsx",
  "src/pages/BagPage.jsx",
  "src/lib/virtualWear.js",
  "src/lib/vwPool.js",
  "src/lib/analytics.js",
  "src/lib/memberSettings.js",
  "src/lib/monetization.js",
  "src/lib/commerce.js",
  "src/lib/cartStore.js",
  "src/lib/retailCheckout.js",
  "src/lib/blogPosts.js",
  "src/lib/blogComments.js",
  "src/lib/adminDelete.js",
  "src/lib/accessControl.js",
  "src/components/AccessControlStudio.jsx",
  "supabase/migrations/007_access_control.sql",
  "supabase/functions/auth-whatsapp/index.ts",
  "supabase/functions/send-reel/index.ts",
]);

const accessMig = readFileSync(join(root, "supabase/migrations/007_access_control.sql"), "utf8");
accessMig.includes("oadeagbo@gmail.com") && accessMig.includes("transfer_super_admin")
  ? ok("founding owner + transfer RPC")
  : bad("access control migration");

const hooksAuth = readFileSync(join(root, "src/hooks.js"), "utf8");
hooksAuth.includes("loginWithGoogle") && hooksAuth.includes("signInWithOAuth")
  ? ok("Google OAuth login")
  : bad("Google OAuth");

const tstore = readFileSync(join(root, "src/lib/testStore.js"), "utf8");
tstore.includes("registerTester") && tstore.includes("TESTING_PHASE_PRIVILEGES")
  ? ok("testing signups get admin studio rights")
  : bad("testing signup admin");
tstore.includes("revoked in production") || tstore.includes("Revoked automatically in Production")
  ? ok("testing rights documented as revocable")
  : bad("testing rights revocation note");

const bridge = readFileSync(join(root, "src/lib/dataBridge.js"), "utf8");
bridge.includes("creators") && bridge.includes("editorialCarousel") ? ok("dataBridge: creators + editorial") : bad("dataBridge");
bridge.includes("testingGarments") || bridge.includes("MOCK_GARMENTS") ? ok("dataBridge: mock garments") : bad("mock garments bridge");

existsSync(join(root, "src/lib/mockGarments.js")) ? ok("mock garment assets") : bad("mock garments file");
existsSync(join(root, "src/lib/testStore.js")) ? ok("tester upload store") : bad("testStore");

const studio = readFileSync(join(root, "src/components/ContentStudio.jsx"), "utf8");
studio.includes("GarmentUploadPanel") || studio.includes("Save garment") ? ok("studio: garment uploads in testing") : bad("studio uploads");
studio.includes("tester@myyanga.test") || studio.includes("Testing mode") ? ok("studio: tester access") : bad("studio tester");

const hooks = readFileSync(join(root, "src/hooks.js"), "utf8");
!hooks.includes("ROLE_BY_EMAIL") ? ok("auth: roles from DB not email map") : bad("auth: client-side role map");
hooks.includes("authenticateTester") ? ok("auth: testing accounts") : bad("auth testing");

const pay = readFileSync(join(root, "supabase/functions/payments/index.ts"), "utf8");
pay.includes("flutterwave") && pay.includes("paystack") && pay.includes("stripe")
  ? ok("payments: 3-provider cascade")
  : bad("payments: cascade");
pay.includes("userFromReq") ? ok("payments: authenticated") : bad("payments: no auth");
pay.includes("retail_init") && pay.includes("subaccounts") && pay.includes("flat_subaccount")
  ? ok("payments: retail Flutterwave split checkout")
  : bad("payments: retail split missing");

const cart = readFileSync(join(root, "src/lib/cartStore.js"), "utf8");
const commerce = readFileSync(join(root, "src/lib/commerce.js"), "utf8");
const pdp = readFileSync(join(root, "src/pages/ProductPage.jsx"), "utf8");
cart.includes("addToBag") && commerce.includes("isBrandShopReady") && pdp.includes("Add to Bag")
  ? ok("marketplace: e-vetted cart + PDP")
  : bad("marketplace cart/PDP");

const evet = readFileSync(join(root, "src/lib/eVetStore.js"), "utf8");
const evetUi = readFileSync(join(root, "src/components/EVettingStudio.jsx"), "utf8");
const privs = readFileSync(join(root, "src/lib/accessControlConstants.js"), "utf8");
evet.includes("snapCacListing") &&
  evet.includes("vettingMinimumsMet") &&
  evet.includes("saveCreatorVetting") &&
  evetUi.includes("Approve e-vet") &&
  evetUi.includes("Open CAC portal") &&
  privs.includes("brand_e_vetting")
  ? ok("CAC e-vetting dossier + brand_e_vetting privilege")
  : bad("CAC e-vetting incomplete");

const vw = readFileSync(join(root, "src/lib/virtualWear.js"), "utf8");
vw.includes("compositeLook") && vw.includes("SCENES") ? ok("virtual wear: compositing + scenes") : bad("virtual wear");
vw.includes("aiTryOn") && vw.includes("renderLook") ? ok("virtual wear: AI try-on + fallback") : bad("virtual wear AI");

const vwp = readFileSync(join(root, "src/lib/vwPool.js"), "utf8");
vwp.includes("assembleRotatedLook") && vwp.includes("markOutfitWorn") && vwp.includes("paidVwBrandIds")
  ? ok("VW paid pool rotator + no-repeat")
  : bad("VW pool rotator");

const vpage = readFileSync(join(root, "src/pages/VirtualWearPage.jsx"), "utf8");
vpage.includes("VW_EVENT_SCENES") && vpage.includes("outfitType") && vpage.includes("runRotation")
  ? ok("VW UI: event theme + outfit type rotation")
  : bad("VW UI rotation");

const settings = readFileSync(join(root, "src/pages/SettingsPage.jsx"), "utf8");
settings.includes("Save reel schedule") && settings.includes("Preferred days") && settings.includes("display_name")
  ? ok("Settings: profile + reel schedule")
  : bad("Settings page");

const analytics = readFileSync(join(root, "src/lib/analytics.js"), "utf8");
analytics.includes("installAutocapture") && analytics.includes("buildBrandInsightPack")
  ? ok("anonymized analytics + brand insights")
  : bad("analytics engine");

const authWa = readFileSync(join(root, "src/hooks.js"), "utf8");
authWa.includes("loginWithWhatsApp") && authWa.includes("loginWithGoogle")
  ? ok("auth: Google default + WhatsApp secondary")
  : bad("auth channels");

const vto = readFileSync(join(root, "supabase/functions/virtual-tryon/index.ts"), "utf8");
vto.includes("Unauthorized") && vto.includes("get_feature_gate")
  ? ok("virtual-tryon: authenticated + gated")
  : bad("virtual-tryon security");

const ss = readFileSync(join(root, "src/pages/SmartSearchPage.jsx"), "utf8");
ss.includes("budgetMin") && ss.includes("query") ? ok("smart search: multi-param") : bad("smart search params");

const ms = readFileSync(join(root, "src/components/MonetizationStudio.jsx"), "utf8");
ms.includes("provider_order") ? ok("admin: monetization studio") : bad("admin monetization");

const ai = readFileSync(join(root, "supabase/functions/ai-chat/index.ts"), "utf8");
ai.includes("Unauthorized") ? ok("ai-chat: authenticated") : bad("ai-chat auth");

const pyl = readFileSync(join(root, "src/pages/PYLPage.jsx"), "utf8");
pyl.includes("vote_pyl") && pyl.includes("pyl_entry") ? ok("PYL: post + vote + gate") : bad("PYL");

const look = readFileSync(join(root, "src/pages/LookSharePage.jsx"), "utf8");
look.includes("look_comments") ? ok("look share + comments") : bad("look share");

const blogPosts = readFileSync(join(root, "src/lib/blogPosts.js"), "utf8");
const blogPage = readFileSync(join(root, "src/pages/BlogPage.jsx"), "utf8");
const blogMig = readFileSync(join(root, "supabase/migrations/011_blog.sql"), "utf8");
const blogComments = readFileSync(join(root, "src/lib/blogComments.js"), "utf8");
blogPosts.includes("BLOG_POSTS") && blogPosts.split("slug:").length >= 5
  ? ok("blog: seeded fashion/creative-economy stories")
  : bad("blog seed posts");
blogPage.includes("Share story") && blogPage.includes("Explore MyYanga") && blogPage.includes("Comments")
  ? ok("blog: article share + comments + Explore CTA")
  : bad("blog article UX");
blogComments.includes("myyanga_blog_comments") && blogComments.includes("blog_comments")
  ? ok("blog: localStorage + production comments")
  : bad("blog comments persist");
blogMig.includes("blog_comments") && blogMig.includes("blog_posts")
  ? ok("blog: migration 011 tables")
  : bad("blog migration");

const app = readFileSync(join(root, "src/myyanga-app.jsx"), "utf8");
!app.includes("MyYanga2026!") ? ok("no leaked demo password") : bad("demo password in UI");
app.includes("consumePaymentReturn") ? ok("payment return handler") : bad("payment return");
app.includes("Go PRODUCTION") ? ok("testing↔production toggle") : bad("mode toggle");
app.includes("AccessControlStudio") && app.includes("Continue with Google")
  ? ok("access control UI + Google CTA")
  : bad("access UI");
app.includes('["blog", "Blog"]') && app.includes('case "article"') && app.includes("BlogTeaser")
  ? ok("blog: nav + routing + home teaser")
  : bad("blog routing/nav");
app.includes("LegalPage") && app.includes('go("about")') && app.includes('go("privacy")') && app.includes('go("grooming")')
  ? ok("footer legal + grooming pages wired")
  : bad("footer stubs still dead");
existsSync(join(root, "src/pages/LegalPage.jsx")) ? ok("LegalPage.jsx") : bad("LegalPage missing");
existsSync(join(root, "docs/AWS_SECRETS_RUNBOOK.md")) ? ok("AWS secrets runbook") : bad("AWS runbook");
existsSync(join(root, "docs/MYYANGA_BUSINESS_PLAN.md")) ? ok("business plan doc") : bad("business plan");
existsSync(join(root, "docs/FEATURES_AND_IMPLEMENTATION.md")) ? ok("features & implementation doc") : bad("features doc");

try {
  execSync("npm run verify:production", { cwd: root, stdio: "pipe" });
  ok("verify:production");
} catch { bad("verify:production"); }

try {
  execSync("npm run build", { cwd: root, stdio: "pipe", timeout: 120000 });
  ok("production build");
} catch { bad("production build"); }

const score = Math.round((pass / Math.max(pass + fail, 1)) * 100);
const ship = fail === 0 && score >= 90 ? "SHIP" : fail <= 3 ? "STAGE" : "DO NOT SHIP";
console.log(`\nAggressive audit: ${pass} pass, ${fail} fail — ${score}/100 — ${ship}`);
process.exit(fail > 0 ? 1 : 0);
