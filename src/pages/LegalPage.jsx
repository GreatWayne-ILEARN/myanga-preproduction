/**
 * Minimal company / policy pages — honest placeholders that never 404.
 * Footer Company + Grooming links land here until CMS content is published.
 */
const PAGES = {
  about: {
    title: "About MyYanga",
    crumbs: "Home / About",
    body: [
      "MyYanga is the portal where lovers of African fashion discover, engage and patronize African creatives — designers, photographers, makeup artists and fabric makers.",
      "Built by ZonicMe Limited (Abuja · Lagos · Diaspora). We are a trust platform: brands settle via gateway split; members see themselves in fashion before they buy; creatives get equal promotion seats when they pay into Discover and Virtual Wear.",
      "Contact: info@myyanga.com · +234 706 242 5945 · Floor M2, Transcorp Hilton, Abuja.",
    ],
  },
  privacy: {
    title: "Privacy",
    crumbs: "Home / Privacy",
    body: [
      "MyYanga collects account details you provide (name, email, phone, city, fashion preference) and anonymized site analytics for product improvement.",
      "We do not sell raw member PII as an analytics product. Brand Insights use aggregated, fashion-granular events. Virtual Wear photos are processed for try-on and are not shared as public profiles without your action (share look).",
      "Production auth uses Supabase Auth (Google / WhatsApp OTP / email). Push subscriptions and reel preferences stay under your Settings control. Full legal text will replace this summary before public launch — this page exists so footer links never 404.",
    ],
  },
  terms: {
    title: "Terms of use",
    crumbs: "Home / Terms",
    body: [
      "By using MyYanga you agree to use the service lawfully, respect creatives’ intellectual property, and not abuse payments, voting, or admin tooling.",
      "Marketplace checkout settles funds to e-vetted designers via Flutterwave / Paystack / Stripe subaccount split; MyYanga commission is taken at the gateway. Feature unlocks (Virtual Wear, Smart Search, Premium, etc.) are entitlements, not retail goods.",
      "Testing-mode accounts and mock settle flows are for QA only and do not create live payment obligations. Formal terms of service will supersede this placeholder at launch.",
    ],
  },
  contact: {
    title: "Contact",
    crumbs: "Home / Contact",
    body: [
      "General: info@myyanga.com",
      "Phone / WhatsApp business line: +234 706 242 5945",
      "Office: ZonicMe Limited, Floor M2, Transcorp Hilton, Abuja, Nigeria.",
      "Brand partnerships and promotion seats: use Admin → Monetization after e-vetting, or email info@myyanga.com with your CAC RC number.",
    ],
  },
  grooming: {
    title: "Grooming",
    crumbs: "Home / Grooming",
    body: [
      "Grooming — barbers, stylists, and beauty creatives — is on the MyYanga roadmap as a Discover vertical alongside fashion designers.",
      "Today, makeup artists and related creatives appear in editorial Focus slots and Discover when promoted. A dedicated Grooming catalogue and filters will ship in a later release.",
      "Until then, explore Blog stories and Discover for creative-economy coverage, or contact us if you want early partner access.",
    ],
  },
};

export default function LegalPage({ page = "about", go }) {
  const meta = PAGES[page] || PAGES.about;
  return (
    <div className="wrap" style={{ paddingBottom: 48 }}>
      <div className="page-head">
        <div className="crumbs">{meta.crumbs}</div>
        <h1 className="serif">{meta.title}</h1>
        <p className="lead">ZonicMe Limited · MyYanga</p>
      </div>
      <div className="panel" style={{ maxWidth: 720 }}>
        {meta.body.map((p, i) => (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.7, margin: i ? "1em 0 0" : 0 }}>
            {p}
          </p>
        ))}
        <button type="button" className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => go?.("home")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export const LEGAL_PAGE_IDS = Object.keys(PAGES);
