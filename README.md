# Realwebwins Research System

## Setup
- Copy `.env.local.example` to `.env.local`.
- Provide the following environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - Optionally `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to enable analytics.
- Install dependencies with `npm install`.

## Local Development
- Run `npm run dev` and open `http://localhost:3000`.
- When Supabase credentials are missing, a local JSON-backed stub is used so you can prototype without network access.

## Analytics
- The layout ships with [Plausible](https://plausible.io) tracking. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (for example, `realwebwins.app`) in both local and production environments.
- Once the variable is present, page views for `/research` and `/dashboard` are tracked automatically—no extra code changes required.

## Feedback Storage
- Feedback submissions are persisted to Supabase table `feedback`. Create it with:

  ```sql
  create table feedback (
    id uuid primary key default gen_random_uuid(),
    name text,
    message text not null,
    rating int,
    created_at timestamptz not null default now()
  );
  ```

- Ensure your Supabase Row Level Security policies allow inserts for the application role, or rely on the local stub in development.

## Testing
- End-to-end tests use [Playwright](https://playwright.dev/).
  - Install browsers once: `npx playwright install`
  - Run the suite: `npm run test`
- The configuration starts `npm run dev` on an ephemeral port and covers the `/research` submission flow end-to-end, including dashboard verification.
- Vercel preview builds can run the same command to catch regressions before production deploys.

## Deploying on Vercel
1. Push the repository to GitHub.
2. In Vercel, import the repo and select the `main` branch.
3. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server-side inserts when not using the stub)
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (optional analytics)
4. Deploy—Vercel runs `npm run build` and serves the standalone output automatically.

