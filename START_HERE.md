# MyYanga — START HERE

This is the complete MyYanga application. Two ways to get it live.

---

## FASTEST: see the UI live in 60 seconds (no Node, no database)

1. Inside this package open the **`dist/`** folder
2. Go to **https://app.netlify.com/drop**
3. Drag the **`dist`** folder onto the page
4. You get a live URL instantly

This shows the full app running in **mock mode** — every page, the editorial
sections, shop, admin, analytics, the white logo bar. No database needed.
The mock⇄live toggle will show, but "live" only works after you do the
Supabase steps below.

---

## FULL: live app with working database

Follow **DEPLOYMENT_RUNBOOK.md** in this folder. In short:

1. **Supabase** (the database): create a project, run the 3 SQL files in
   `supabase/migrations/` in order (001, 002, 003), create 4 storage buckets,
   run `scripts/seed-users.mjs` to create the owner + demo logins.
2. **Frontend**: copy `.env.example` → `.env.local`, paste your Supabase URL
   and anon key.
3. **Deploy**: drag `dist/` to Netlify (or connect the repo). Add the same
   env vars in Netlify settings.
4. Flip the **DB MOCK/LIVE** toggle (bottom-left) to test both.

Login after seeding (password `MyYanga2026!`):
- Owner / Super Admin: owner@myyanga.com  ← only one who can "Delete All"
- Staff Admin: admin@myyanga.com  ← delete single / multi-tick only
- Brand Owner: deola@myyanga.com
- Regular User: ada@myyanga.com

---

## What's in this package

| Path | What it is |
|---|---|
| `dist/` | **Pre-built, ready-to-deploy site** (drag to Netlify) |
| `src/myyanga-app.jsx` | The full application source |
| `src/lib/` | Supabase client, mock⇄live toggle, data bridge |
| `src/hooks/` | Data hooks |
| `src/components/DeleteControls.jsx` | Role-based delete UI |
| `supabase/migrations/001_schema.sql` | All 17 database tables + security |
| `supabase/migrations/002_owner_and_delete.sql` | Owner-only Delete All |
| `supabase/migrations/003_seed.sql` | Real content for every section |
| `supabase/functions/` | AI assistant + Paystack payment handlers |
| `scripts/seed-users.mjs` | Creates owner + demo users |
| `DEPLOYMENT_RUNBOOK.md` | Full step-by-step deploy guide |
| `netlify.toml` / `vercel.json` | Host configs (auto-detected) |

---

## Verified

The source compiles cleanly (`npm run build` succeeds, zero errors). The
`dist/` folder in this package is the actual output of that build. What has
NOT been done from my side: deploying to your accounts (needs your logins)
and clicking through a running instance. Following the steps above is what
makes it live and lets you confirm it end to end.

*MyYanga v3.1 · ZonicMe Limited*
