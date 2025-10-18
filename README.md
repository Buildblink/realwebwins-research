# Realwebwins Research System

## Setup
- Copy `.env.local.example` to `.env.local` (or create `.env.local`) and provide:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Install dependencies with `npm install`.

## Local Development
- Run `npm run dev` and open `http://localhost:3000`.

## Deploying on Vercel
1. Push the project to GitHub.
2. On Vercel, import the repository and select the main branch.
3. In the Vercel dashboard, add the same `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables.
4. Trigger a deployment; Vercel will build the app using `npm run build` and serve the production site.

