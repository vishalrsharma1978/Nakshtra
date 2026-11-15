# ✨ Nakshtra — Astrology Platform

A full-stack astrology platform inspired by apps like AstroAI: daily horoscopes, kundli basics,
an **expert Q&A forum with SLA-backed replies** (free + paid fast-track), **1-to-1 video
consultations**, Razorpay payments, and a complete **admin panel**.

## Architecture

| Piece | Tech | Where |
|---|---|---|
| User app (Android / iOS / Web) | Expo (React Native + react-native-web), React Navigation | `apps/mobile` |
| Admin panel (Web) | React + Vite + React Router | `apps/admin` |
| Shared types, i18n (EN/HI), zodiac + SLA logic | TypeScript workspace package | `packages/shared` |
| Database, Auth, Realtime chat, RLS | Supabase (PostgreSQL) | `supabase/migrations` |
| Payments (orders, webhook fulfilment) & SLA cron | Supabase Edge Functions + Razorpay | `supabase/functions` |
| Video calls | Jitsi Meet (meet.jit.si), WebView on native / iframe on web | built-in |

### Feature map

- **Auth** — email/password via Supabase Auth; profile auto-created by DB trigger.
- **Daily horoscope** — per zodiac sign & language, editable from the admin panel.
- **Kundli basics** — sun-sign computation from birth details (EN/HI traits).
- **Ask Experts forum** — users post questions; realtime chat thread per question.
  - **Free tier**: expert reply within the configured SLA (default 48 h).
  - **Fast track (paid)**: priority SLA (default 4 h) after Razorpay payment.
  - SLA countdown shown to users; breaches highlighted in the admin queue and logged by the `sla-check` cron function.
- **Video consultations** — book a slot with a consultant, pay via Razorpay, join a Jitsi room from the app; admin/expert joins from the admin panel.
- **Admin panel** — dashboard KPIs, question queue with assignment + inline expert replies, consultant CRUD, user tracking (roles, last seen, activity log), consultations, payments ledger, SLA/pricing/gateway settings, horoscope editor.

## Prerequisites

- Node.js ≥ 20, npm
- A [Supabase](https://supabase.com) project
- A [Razorpay](https://razorpay.com) account (test keys work)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for pushing migrations & deploying functions

## 1. Install

```powershell
npm install
```

## 2. Set up Supabase

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # applies supabase/migrations
```

Deploy the edge functions:

```powershell
supabase functions deploy create-razorpay-order
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy sla-check --no-verify-jwt
```

Set function secrets (never commit these):

```powershell
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=xxx SLA_CHECK_SECRET=any-random-string
```

### Razorpay webhook

In the Razorpay dashboard → Webhooks, add:

```
https://YOUR_PROJECT.supabase.co/functions/v1/razorpay-webhook
```

with events `payment.captured` and `payment.failed`, using the same webhook secret.

### SLA cron

Schedule `sla-check` every 15 minutes (Supabase Dashboard → Edge Functions → Schedules, or
pg_cron + pg_net), sending header `x-sla-secret: <SLA_CHECK_SECRET>`.

## 3. Configure the apps

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
Copy-Item apps/admin/.env.example apps/admin/.env
```

Fill both with your Supabase **Project URL** and **anon/publishable key**
(Dashboard → Settings → API).

## 4. Bootstrap an admin

Sign up once through the app, then promote yourself (SQL editor):

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

## 5. Run

```powershell
npm run mobile:web     # user app in the browser (http://localhost:8081)
npm run mobile         # Expo dev server (scan QR with Expo Go for Android/iOS)
npm run admin          # admin panel (http://localhost:5173)
```

Tests:

```powershell
npm test --workspace packages/shared
```

## Project structure

```
apps/
  mobile/           # Expo app (Android + iOS + Web)
    src/screens/    # Auth, Home, Questions/Chat, Consult, Kundli, Payment, VideoCall, Profile
    src/context/    # AuthContext (session, profile, settings, i18n)
  admin/            # Vite React admin panel
    src/pages/      # Dashboard, Questions, Experts, Users, Consultations, Payments, Horoscopes, Settings
packages/
  shared/           # Types, EN/HI i18n, zodiac + SLA helpers (+ tests)
supabase/
  migrations/       # 0001_init.sql (schema + RLS), 0002_seed.sql (sample experts/horoscopes)
  functions/        # create-razorpay-order, razorpay-webhook, sla-check
```

## Security model

- **Row Level Security** on every table: users see only their own data; experts see assigned
  question threads; admins see everything (enforced by `is_admin()` / `is_expert()` SQL helpers).
- **Payment amounts are computed server-side** in the edge function — the client never sends an amount.
- **Webhook signatures verified** (HMAC-SHA256, constant-time compare) before fulfilment.
- Razorpay **key secret / webhook secret live only in edge function secrets**; the admin panel stores only the public key id.
- `payments` table is written exclusively by the service role (no client insert/update policies).

## Deployment

- **Render (web, one click)**: this repo ships a [render.yaml](./render.yaml) Blueprint that deploys
  both the user app (`nakshtra-app`) and the admin panel (`nakshtra-admin`) as free static sites.
  Push the repo to GitHub, then in Render: **New + → Blueprint → select the repo → Apply**.
- **User app (web, manual)**: `cd apps/mobile && npx expo export --platform web` → deploy `dist/` to any static host.
- **User app (stores)**: use [EAS Build](https://docs.expo.dev/build/introduction/) (`npx eas build`).
- **Admin panel (manual)**: `npm run admin:build` → deploy `apps/admin/dist/` (restrict access, e.g. behind SSO/VPN, for defence in depth).
