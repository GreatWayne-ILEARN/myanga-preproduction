# MyYanga v4 — Production Build

## Testing vs Production

Default mode is **Testing** (no Supabase required):

| | Testing | Production |
|--|---------|------------|
| Data | Mock garments + localStorage uploads | Supabase |
| Auth | Google button → `oadeagbo@gmail.com` super admin; tester accounts | Google OAuth + email; roles from DB |
| Admin Studio | Admins can upload page media + garments | Privilege-gated studios |
| Access Control | Transfer / co-share / privilege grants (local) | Live RPCs (migration 007) |
| Pay gates | All free | Live monetization |
| Virtual Wear | On-device compositing with mock assets | AI try-on when `GOOGLE_API_KEY` set |

### Founding super admin

**`oadeagbo@gmail.com`** is the default founding super admin (settings + `handle_new_user` + `claim_founding_owner`).

- Sign in with **Continue with Google** using that Gmail — ownership is claimed automatically.
- **Admin → Access Control**: allocate privileges, co-share ownership, or transfer super admin (type `TRANSFER SUPER ADMIN`).
- Co-owners get full privilege access; only the sole super admin can transfer or add/remove co-owners.

Enable Google in Supabase: Authentication → Providers → Google (Client ID/Secret). Add your site URL to redirect allow-list.

Admins see a **Mode: TESTING / PRODUCTION** toggle (bottom-left). Production requires `VITE_SUPABASE_*` env vars.

### Tester workflow

1. Open app (Testing mode by default)
2. **Sign up with any email** — during the testing phase every new account is granted full Admin Studio access automatically (content, garments, editorial, monetization, analytics, events, delete-selected). Google sign-in in testing does the same.
3. Admin → Content Studio / Access Control — upload page media, garments, publish editorial
4. Virtual Wear / Smart Search use seed mock assets + your uploads
5. Switch to Production (needs env) — **testing admin rights do not carry over**: production roles come from the `profiles` table + Access Control grants, so all auto-granted tester privileges are revoked.

### Pre-production package

```bash
npm run package:staging
```

Includes `dist/` (fresh build), all source, migrations (`001`–`007`), edge functions, and docs. Excludes only `node_modules` and `.git`.

## Environment

Copy `.env.example` to `.env` and set client + edge secrets. Full AWS/platform inventory (fail-soft behaviour for Gemini / Resend / WhatsApp): **`docs/AWS_SECRETS_RUNBOOK.md`**.

| Variable | Where |
|----------|--------|
| `VITE_SUPABASE_URL` | Client |
| `VITE_SUPABASE_ANON_KEY` | Client |
| `PUBLIC_APP_URL` | Edge functions (return URLs) |
| `FLUTTERWAVE_SECRET_KEY` | Edge `payments` |
| `PAYSTACK_SECRET_KEY` | Edge `payments` |
| `STRIPE_SECRET_KEY` | Edge `payments` |
| `ANTHROPIC_API_KEY` | Edge `smart-search`, `ai-chat` |
| `GOOGLE_API_KEY` | Edge `virtual-tryon` (Gemini; missing → canvas fallback) |
| `RESEND_API_KEY` | Edge `send-reel` email (missing → soft-fail; inbox OK) |
| `WHATSAPP_CLOUD_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | `auth-whatsapp`, `send-reel` (no BSP) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge only |

### Founding super admin (verify)

**`oadeagbo@gmail.com`** = `FOUNDING_OWNER_EMAIL`. Migration `007` seeds + `claim_founding_owner` RPC. Production Google login auto-claims when email matches and `is_owner` is false (`hooks.js` → `enrichProductionProfile`). Testing Google button signs in as founding owner immediately.

### Testing Admin Studio rights (verify)

`registerTester` / Google tester path grants `TESTING_PHASE_PRIVILEGES` — full Admin Studio. Production uses DB roles only; testing rights do not carry over.

## Database

```bash
npm run sb:migrate   # applies 004–006
```

Migrations add: creators, garments, looks/comments, events, PYL voting, editorial_daily, monetization (gates, payments, entitlements), RLS hardening.

## Edge functions

```bash
npm run sb:deploy    # payments, smart-search, ai-chat, virtual-tryon
```

- **payments** — authenticated init/verify; Flutterwave → Paystack → Stripe cascade; webhooks
- **smart-search** — multi-parameter garment search + optional AI summary
- **ai-chat** — authenticated analytics assistant
- **virtual-tryon** — photorealistic try-on (Gemini image editing); authenticated + gated on `virtual_wear`; client falls back to on-device canvas compositing when the key is unset or the model errors

## Client build

```bash
npm install
npm run build
npm run verify:production
npm run audit:aggressive   # target: 100/100 SHIP
```

Output: `dist/` — deploy to any static host (Vercel, Netlify, S3+CloudFront). Configure SPA fallback so `/look/:code` routes to `index.html`.

## Staging package

```bash
npm run package:staging
```

Creates `~/Downloads/myyanga-v4-staging-package.zip`.

## Feature gates (admin)

Admin → **Monetization** sets per-feature `free` / `paid` and price. Gates apply immediately via `get_feature_gate` RPC:

- `virtual_wear`, `smart_search`, `pyl_entry`, `premium`, `events`, `creator_promotion`

## Owner setup

1. Deploy DB + functions
2. Create owner account; set `is_owner = true` on their `profiles` row (first deploy only)
3. Publish editorial carousel (Admin → Editorial) — persists to `editorial_daily` in LIVE mode
4. Seed creators/garments from migration `006` or add via SQL/admin tools

## Known v1 limits

- Shop checkout UI still routes to product detail stubs
- Garment seed images are placeholders until CDN URLs are added (AI try-on quality improves with real garment photos)
