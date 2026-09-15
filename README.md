# CNAM Dashboard

A role-based web portal simulating Tunisia's national health insurance system (CNAM) — insured members (assurés), healthcare providers (prestataires), internal staff (agents, validators, admins), and a dedicated security operations view, all behind Supabase-backed auth with TOTP 2FA and OTP email verification.

This is the web application layer of the "Cloud CNAM Infra" project — it's the front-facing app that runs inside the GNS3/OpenStack network simulation (VLAN-segmented, Wazuh-monitored) built for that project.

## Tech stack

- **Vite + React 18 + TypeScript**
- **shadcn-ui** (Radix primitives) + **Tailwind CSS**
- **Supabase**: Postgres, Auth, and 20 Edge Functions (see below) as the entire backend — this is a pure client-side SPA, there's no separate Node/API server to deploy
- **TanStack Query** for data fetching, **React Router** for client-side routing
- **Vitest** + Testing Library for tests (`src/test/`)

## Roles & routes

| Role | Base route | Access |
|---|---|---|
| `admin_superieur` | `/app/super-admin/*` | Full access — assurés, prestataires, remboursements, documents, calendrier, rapports, utilisateurs, sécurité, paramètres |
| `admin`, `agent`, `validator` | `/app/admin/*` | Same operational pages as super-admin; only `admin` gets utilisateurs/sécurité/paramètres |
| `user` (assuré) | `/app/user/*` | Own requests, documents, calendar, profile |
| `prestataire` | `/app/prestataire/*` | Demandes, paiements, profil |
| `security_engineer` | `/app/soc` | Dedicated SOC dashboard |

Auth state and route guarding live in `src/hooks/useAuth.tsx` and `src/components/auth/ProtectedRoute.tsx`. `SessionTimeoutProvider` handles idle session expiry.

## Backend (Supabase)

The database schema (22 migrations) and all server-side logic live in `supabase/`:

- `supabase/migrations/` — schema history
- `supabase/functions/` — Edge Functions: `create-user`, `update-user`, `delete-user`, `setup-totp`, `verify-totp`, `reset-totp` / `reset-totp-admin`, `check-totp-status`, `send-otp` / `verify-otp`, `send-registration-otp` / `verify-registration-otp` / `send-registration-decision`, `send-password-change-otp` / `change-password`, `send-password-expiry-reminder`, `send-welcome-email`, `send-security-alert`, `security-login`, `ai-chat`, `notify-registration-request`

This repo doesn't provision that backend — it assumes a Supabase project already exists with these migrations applied and these functions deployed (via `supabase db push` / `supabase functions deploy` using the Supabase CLI, a one-time setup already done for the existing project, not covered here).

## Local setup

```bash
git clone https://github.com/ranimejemal/cnam-dashboard.git
cd cnam-dashboard
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase project's values (Project Settings → API in the Supabase dashboard):

```
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-public-key"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
```

The publishable/anon key is safe to expose client-side by Supabase's design (access is enforced by Row Level Security policies on the database, not by hiding this key) — but it still shouldn't be committed to git as a matter of hygiene, which is why `.env` is gitignored here.

```bash
npm run dev      # starts on :8080
npm run test      # vitest
npm run build     # production build -> dist/
```

## Deploying (Vercel)

This is a static Vite build with no server-side runtime to run — a genuinely good fit for Vercel, unlike the ASP.NET/MySQL SchoolApp project.

1. Vercel dashboard → **Add New → Project** → import this repo. Framework preset auto-detects as **Vite**; build command `npm run build`, output directory `dist` (defaults, no changes needed).
2. **Environment Variables**: add the same three from `.env` —
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`

   These are read at **build time** (`import.meta.env`), so they must be set in Vercel before the build runs, not just at runtime.
3. Deploy. `vercel.json` in this repo rewrites all paths to `/index.html`, which client-side routes need — without it, refreshing or deep-linking to any route other than `/` (e.g. `/app/user/documents`) would 404 on Vercel's static file server.
4. The Supabase backend is already live and shared — no database setup step here, unlike SchoolApp.

## Notes / housekeeping

- A real `.env` with live Supabase credentials was previously committed to this repo. The anon/publishable key is meant to be public (Supabase's security model relies on RLS, not key secrecy), so this isn't a MySQL-password-style leak — but it's been removed from tracking going forward regardless, replaced by `.env.example`.
- Three lockfiles are present (`package-lock.json`, `bun.lock`, `bun.lockb`) from what looks like a package-manager switch at some point. Not fixed here since removing one could break whichever workflow you're actually using locally — worth consolidating to one when convenient.
