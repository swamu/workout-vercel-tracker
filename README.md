# Workout Vercel Tracker

Simple Next.js app to track your workout schedule and mark each day complete.
Each user signs in and has private workout progress and weekly measurements.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Supabase setup (required for auth + data)

1. Create a free Supabase project.
2. In Supabase SQL editor, run:

```sql
create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists app_sessions (
  token text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists workout_completions (
  user_id uuid not null references app_users(id) on delete cascade,
  day_id text not null,
  is_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day_id)
);

create table if not exists weekly_measurements (
  user_id uuid not null references app_users(id) on delete cascade,
  week_index int not null,
  weight text,
  neck text,
  shoulders text,
  chest_bust text,
  upper_arm_biceps text,
  forearm text,
  midsection text,
  waist text,
  abdomen text,
  hips text,
  thigh_top text,
  mid_thigh text,
  knee text,
  calf text,
  ankle text,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_index)
);
```

3. Add env vars in `.env.local` (see `supabase.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Restart dev server.

4. Restart dev server.
5. Open the app and create your account using Sign Up.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: Next.js (auto-detected).
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Project Settings -> Environment Variables.
5. Click Deploy.
