# MyYanga v4 — Environment & secrets (AWS / platform engineers)

Copy to `.env` (Vite client) and set matching **Supabase Edge secrets** for Deno functions.

## Client (Vite — baked at build time)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Production | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Production | Public anon key (RLS still applies) |
| `VITE_GOOGLE_AUTH` | Optional | UI hint that Google is enabled (`true`) |

## Edge function secrets (`supabase secrets set …`)

| Secret | Function(s) | Fail-soft if missing |
|--------|-------------|----------------------|
| `GOOGLE_API_KEY` | `virtual-tryon` (Gemini 2.5 Flash Image) | Returns `501 { fallback: true }` → client canvas compositing |
| `ANTHROPIC_API_KEY` | `smart-search`, `ai-chat` | AI summary / chat degrade; search still works locally in Testing |
| `FLUTTERWAVE_SECRET_KEY` | `payments` | Cascade skips to next provider |
| `PAYSTACK_SECRET_KEY` | `payments` | Cascade skips |
| `STRIPE_SECRET_KEY` | `payments` | Cascade skips |
| `SUPABASE_SERVICE_ROLE_KEY` | `payments`, gates, webhooks | Required for Production payments / gate RPC |
| `PUBLIC_APP_URL` | `payments` return URLs | Use live SPA origin |
| `RESEND_API_KEY` | `send-reel` email | `501` soft-fail; **in-app reel still delivered** |
| `REEL_EMAIL_FROM` | `send-reel` | Default `MyYanga <reels@myyanga.com>` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | web push (planned) | Local Notification / queue until wired |
| `WHATSAPP_CLOUD_TOKEN` | `auth-whatsapp`, `send-reel` | OTP / Cloud send soft-fail → Testing mock / `wa.me` queue |
| `WHATSAPP_PHONE_NUMBER_ID` | same | Required with Cloud token (**no BSP**) |

## Google stack checklist

1. **Google OAuth login** — Supabase Auth → Providers → Google (Client ID/Secret from Google Cloud Console). Redirect allow-list must include SPA origin. Founding owner: `oadeagbo@gmail.com` (`FOUNDING_OWNER_EMAIL` + RPC `claim_founding_owner` in migration `007`).
2. **Gemini Virtual Wear** — set `GOOGLE_API_KEY` on the project; deploy `virtual-tryon`. Without key, UX remains usable via canvas.
3. **Reel delivery** — in-app always works. Email needs Resend. Push needs VAPID + web-push library on edge. WhatsApp Cloud optional; client queues `wa.me` / dedicated SIM manual send when Cloud secrets absent.

## SPA hosting

Deploy `dist/` to S3+CloudFront / Amplify / Netlify / Vercel. Configure **SPA fallback** so `/look/*` and deep links serve `index.html`.

## Migrations

Apply `supabase/migrations/001` through `011` (`npm run sb:migrate` or SQL Editor in order).

---

*ZonicMe Limited · MyYanga v4 pre-production*
