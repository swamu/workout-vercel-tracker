# Workout Vercel Tracker

Simple Next.js app to track your workout schedule and mark each day complete.
By default, completion state is stored in browser localStorage.
You can also use a free Supabase database for cloud sync.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Optional: free DB with Supabase

1. Create a free Supabase project.
2. In Supabase SQL editor, run:

```sql
create table if not exists workout_completions (
  day_id text primary key,
  is_done boolean not null default false,
  updated_at timestamptz not null default now()
);
```

3. Add env vars in `.env.local` (see `supabase.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Restart dev server.

When these env vars are present, the app syncs completions to Supabase.
If missing, it automatically falls back to localStorage.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: Next.js (auto-detected).
4. (Optional for cloud sync) Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Project Settings -> Environment Variables.
5. Click Deploy.
