# MyYanga v3.1 — Functional & Technical Documentation + Staging Guide
*ZonicMe Limited · React + Vite + Supabase + PWA*

MyYanga is a pan-African fashion lifestyle marketplace: discovery, e-commerce, editorial content, competitions, premium subscriptions and AI-assisted Virtual Wear. It runs in **MOCK mode** with no backend (every screen works) and flips to **LIVE** against Supabase.

---

## 1. Functional architecture

### 1.1 Landing page
- **Hero** in brand red (`#850713`) with the tagline "The Best of African Fashion, in one spot · Explore ● Shop ● Win" and CTAs to Virtual Wear and Shop.
- **Editorial carousel** — an auto-advancing, swipeable carousel of the weekly features, each slide loaded from admin and revealing admin-entered details:
  - Outfit of the Day, Bride of the Week, Groom of the Week, Couple of the Week, Photograph of the Week, Fabric of the Week, Makeup Artistry of the Week, Designer in Focus.
  - Each slide shows the kind (gold label), title, creator/brand and image; a **Reveal details** button expands the full description the admin typed; **See more** routes through to Shop/Discover. Prev/next arrows + dot navigation; 5-second auto-rotate.
- **Explore by category** — the full taxonomy (Her/His Fashion, Photography, Make Up, Fabrics).
- **Featured shop** row + **Premium** call-to-action.

### 1.2 Public pages
Explore (category tree), Shop (product grid), Smart Search (live filter by name/brand/category), Discover (editorial cards), Post Your Look (vote-based competition entries), Premium (gated content + subscribe), and **Virtual Wear**.

### 1.3 Virtual Wear (AI styling funnel)
Photo upload (kept client-side, never stored) → brief (event, outfit style, colour, budget) → pick up to 3 of 8 designers → **3 complete looks** generated, each with a per-item price breakdown (head piece, main outfit, shoes, jewellery, bag, belt) + total → "Shop this look".

### 1.4 Accounts & roles
Email/password auth (Supabase in live; mapped demo logins in mock). Roles: **owner** (super admin), **admin** (staff), **brand**, **user**. The header exposes an **Admin** entry to owner/admin.

### 1.5 Admin
Sidebar console with:
- **Content Studio** — visual editor for page text + hero media with a live preview and one **Publish**. Image uploads auto-size to Mobile/Tablet/Desktop in-browser. Owner-gated (the super-admin-granted right).
- **Editorial** — manages the landing carousel: per-feature kind, title, creator, **details** (what visitors reveal) and an auto-sized image, with a slide preview and **Publish carousel**.
- **Analytics** — 9-KPI grid with an AI summary line.
- **Products / Brands / Discovers / Premium** — tables with **role-based delete**: owner sees "Delete All" (typed confirm); admin gets per-row + multi-select only.
- **Reel Config** — the §2.5 reel & notification settings (delivery mode, images per reel, max brand slots, frequency, eligibility) + brand placements with impression budgets.
- **Resources** — per-site / any-combination / all-cumulated usage & cost table with KPIs and a cost-by-site chart.

### 1.6 Role-based delete (two layers)
UI hides "Delete All" from non-owners; the **server-side** `delete_all_records()` raises unless `is_owner()`, and `delete_selected_records()` requires admin — enforced even if the UI is bypassed. RLS scopes brand owners to their own rows.

---

## 2. Technical architecture

### 2.1 Stack
React 18 + Vite 5 SPA · Supabase (Postgres + Auth + Storage + Edge Functions) · PWA (manifest + service worker, web-push) · Paystack (payments) · Anthropic (AI summaries). No router/UI-library dependencies — a state router and an injected stylesheet keep the bundle lean.

### 2.2 File structure
```
index.html              Vite entry (theme-color #850713, Raleway, manifest)
src/main.jsx            mounts <App/>
src/myyanga-app.jsx     app: router, pages, Carousel, Virtual Wear, Admin, footer
src/lib/supabase.js     env-guarded Supabase client (null in mock)
src/lib/dataBridge.js   MOCK⇄LIVE bridge (falls back to mock on error)
src/lib/mockData.js     mock content for every section
src/lib/editorial.js    carousel features + get/saveEditorial (admin-managed)
src/lib/responsiveImage.js  canvas device-sizing util
src/hooks.js            useAuth (role mapping), useDbMode
src/components/DeleteControls.jsx   role-based delete UI
src/components/ContentStudio.jsx    visual page editor
supabase/migrations/    001 schema (25 tables) · 002 owner/delete · 003 seed
supabase/functions/     ai-chat (Anthropic) · payments (Paystack)
scripts/seed-users.mjs  owner + demo users
public/manifest.json, public/sw.js   PWA + web push
```

### 2.3 Data model (Postgres, RLS on)
Core: `profiles`, `listings`(brands), `products`(+`product_pictures`,`product_shipments`), `categories`, `locations`, `orders`, `settings`. Content: `editorial_picks`, `discovers`, `posts`, `groom_tips`, `tvs`, `premium_content`, `pyl_entries`, `ads`. Engagement: `subscriptions`, `saved_items`, `image_interactions`. Reel/notification: `reel_config`, `reel_brand_placements`, `user_notifications`, `notification_data`, `push_subscriptions`. Content tables are publicly readable; writes require admin/owner.

### 2.4 Mock⇄Live bridge
`dataBridge.js` defaults to MOCK so the app always renders. In LIVE it reads Supabase and **falls back to mock on any error**, so a misconfigured DB never blanks the UI. The bottom-left toggle flips modes; LIVE only activates when env vars are present.

### 2.5 Brand palette (locked)
- **Red:** `--maroon: #850713` — exact, taken from your `theme-color`.
- **Gold:** `--gold: #C9A227` — set in one place at the top of the stylesheet in `src/myyanga-app.jsx`. If you have an exact brand-gold hex, change this single value (and the manifest if desired) to pin it precisely.
- Cream `#F5F0E8`, ink `#1A1A1A`. Fonts: Raleway (UI) + Playfair Display (headings).

---

## 3. Staging & deployment

### 3.1 Fastest — UI live in mock mode (no DB)
1. `npm install && npm run build` → produces `dist/`.
2. Drag `dist/` to https://app.netlify.com/drop → live URL in ~30s.
Every page works, including the carousel and admin (log in as `owner@myyanga.com`, any password, in mock).

### 3.2 Full — live database
1. **Supabase:** create a project; in SQL Editor run `supabase/migrations/001_schema.sql`, then `002`, then `003`.
2. **Storage buckets:** `product-images`, `brand-assets`, `editorial` (public), `user-uploads` (private).
3. **Users:** `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-users.mjs` (creates owner + demo logins, password `MyYanga2026!`).
4. **Edge functions:** `supabase functions deploy ai-chat payments`; `supabase secrets set ANTHROPIC_API_KEY=… PAYSTACK_SECRET_KEY=…`.
5. **Frontend env:** copy `.env.example` → `.env.local`, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SHOW_DB_TOGGLE=true`.
6. **Deploy:** Netlify (drag `dist/` or connect Git) or Vercel (auto-detects Vite). Add the same `VITE_*` env vars in host settings. Flip the DB toggle to confirm LIVE.

### 3.3 Verify checklist
- [ ] Landing carousel rotates through the 8 editorial features; Reveal details shows admin text.
- [ ] Admin → Editorial: edit a feature, Publish, reload → the carousel reflects it.
- [ ] Admin → Content Studio: edit page text + upload an image (see device sizes), Publish.
- [ ] owner sees Delete All; admin does not; multi-select delete works.
- [ ] Virtual Wear returns 3 priced looks.
- [ ] Toggle DB MOCK/LIVE reloads content from Supabase.

### 3.4 Notes
- The Editorial/Content Studio publish persists locally in this build; in LIVE wire them to `editorial_picks` / a `site_content` table (schema present).
- Reel dispatch (WhatsApp via Termii, web-push) runs server-side once the edge functions + keys are deployed; the config UI, schema and service worker are included.
