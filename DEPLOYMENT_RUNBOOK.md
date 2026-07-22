# MyYanga — Live Deployment Runbook
### Stage a fully working app on Netlify/Vercel with a live Supabase database

This gets you from zip to live URL with a working mock⇄live toggle, seeded
content in every section, and the role-based delete system. ~30 minutes.

---

## Prerequisites
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Netlify](https://netlify.com) **or** [Vercel](https://vercel.com) account
- Node.js 18+ installed locally
- The Supabase CLI: `npm install -g supabase`

---

## PART 1 — Supabase backend (15 min)

### 1.1 Create the project
1. Go to supabase.com → New Project
2. Name it `myyanga`, set a strong database password, pick a region close to Nigeria (e.g. `eu-west-2` London)
3. Wait ~2 min for it to provision

### 1.2 Run the schema
1. In the Supabase dashboard → **SQL Editor** → New Query
2. Open `supabase/migrations/001_schema.sql`, paste the whole file, click **Run**
3. Repeat for `002_owner_and_delete.sql`
4. Repeat for `003_seed.sql` — this fills every section with real content

You should see "Success. No rows returned" for each. Check **Table Editor** —
`products`, `editorial_picks`, `discovers`, etc. now have rows.

### 1.3 Create storage buckets
Dashboard → **Storage** → New Bucket, create these four (mark the first
three **Public**, last one private):
- `product-images` (public)
- `brand-assets` (public)
- `editorial` (public)
- `user-uploads` (private)

### 1.4 Create the owner + demo users
From your local machine, in the project folder:
```bash
npm install
SUPABASE_URL=https://YOURPROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
node scripts/seed-users.mjs
```
Get the service role key from Dashboard → Settings → API → `service_role` (secret).

This creates:
| Role | Email | Password |
|---|---|---|
| Owner / Super Admin | owner@myyanga.com | MyYanga2026! |
| Staff Admin | admin@myyanga.com | MyYanga2026! |
| Brand Owner | deola@myyanga.com | MyYanga2026! |
| Regular User | ada@myyanga.com | MyYanga2026! |

**Only `owner@myyanga.com` has `is_owner = true`** — only they can Delete All.

### 1.5 Deploy the Edge Functions (AI + payments)
```bash
supabase login
supabase link --project-ref YOURPROJECT
supabase functions deploy ai-chat
supabase functions deploy payments
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your-key
```
(Skip this step for now if you just want to test the UI + toggle — the app
works without it; the AI summaries fall back to a canned message.)

---

## PART 2 — Frontend config (5 min)

### 2.1 Add environment variables
Copy `.env.example` to `.env.local` and fill in:
```
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
VITE_SHOW_DB_TOGGLE=true
```
Get both values from Dashboard → Settings → API.
`VITE_SHOW_DB_TOGGLE=true` keeps the mock⇄live switch visible in production
so you can test the toggle. Remove it for the real public launch.

### 2.2 Test locally
```bash
npm install
npm run dev
```
Open `http://localhost:5173`. You'll see the app in **mock** mode.
Click the floating **DB MOCK/LIVE** toggle (bottom-left) → it flips to **LIVE**
and the same screens now pull from your Supabase database. Flip back and forth
to confirm both work.

---

## PART 3 — Deploy to Netlify or Vercel (10 min)

### Option A — Netlify (drag & drop, fastest)
1. Run `npm run build` → produces `dist/`
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the **`dist`** folder onto the page → live URL in ~30 sec
4. In Netlify → Site Settings → Environment Variables, add the same three
   `VITE_*` vars from step 2.1, then redeploy

### Option B — Netlify (Git, auto-deploy)
1. Push this folder to a GitHub repo
2. Netlify → Add New Site → Import from Git → pick the repo
3. Build command `npm run build`, publish directory `dist` (already in `netlify.toml`)
4. Add the three `VITE_*` env vars → Deploy

### Option C — Vercel
1. Push to GitHub
2. Vercel → Add New Project → import the repo
3. Vercel auto-detects Vite (config in `vercel.json`)
4. Add the three `VITE_*` env vars → Deploy

---

## PART 4 — Verify everything works

On your live URL, check:
- [ ] Home page shows editorial cards (Outfit of Day, Bride/Groom/Couple of Week, Designer in Focus)
- [ ] Each editorial section shows ONE current card + a "Previous" archive button
- [ ] Shop shows products with real photos
- [ ] Toggle the DB switch — content reloads from live DB, then back to mock
- [ ] Log in as `owner@myyanga.com` → Admin → Products → you see **"Delete All Products"** button
- [ ] Log in as `admin@myyanga.com` → Admin → Products → NO Delete All, but checkboxes + per-row Delete work
- [ ] Multi-tick several products → red bar appears → "Delete N selected" works
- [ ] AI analytics summaries appear at the top of analytics tabs

---

## The role-based delete system — how it's enforced

**Two layers of protection:**

1. **UI layer** (in `AdminProducts`): the "Delete All" button only renders when
   `userRole === "owner"`. Admins see checkboxes and per-row delete only.

2. **Database layer** (the real guard, in `002_owner_and_delete.sql`): the
   `delete_all_records()` function checks `is_owner()` server-side and **raises
   an exception** if anyone but the owner calls it — even if they bypass the UI.
   The `delete_selected_records()` function requires admin role. Row Level
   Security means brand owners can only ever delete their own products.

This means even a technical user opening the browser console cannot trigger a
Delete All unless they're the owner — the server rejects it.

---

## Wiring the real logged-in role (after testing)

In `src/myyanga-app.jsx`, `AdminProducts` currently defaults to `userRole="owner"`
for testing. To use the real logged-in user's role, in the AdminShell where
`<AdminProducts/>` is rendered, pass the role from the profile:

```jsx
import { useAuth } from './hooks';
// inside AdminShell:
const { profile } = useAuth();
const role = profile?.is_owner ? "owner" : profile?.role;
// then:
case "admin-products": return <AdminProducts userRole={role}/>;
```

Apply the same `userRole` pattern to the other admin tables (brands, orders,
discovers, premium) to extend the delete system platform-wide. The delete
handlers and modal are already proven in `AdminProducts` — copy that block.

---

## Cleaning out the production database

Once real data is in and you want a clean slate before launch: log in as the
**owner**, go to each admin section, click **Delete All**, type the confirmation
phrase. This wipes that table via the server-side function. Tables you can
bulk-clear: products, brands, orders, discovers, premium_content, ads,
pyl_entries, editorial_picks, image_interactions, saved_items, subscriptions.

---

*MyYanga v3.1 · ZonicMe Limited · Built with Supabase + React + Vite*
