-- Supabase schema for FakeNewsZeiTon
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key,
  email text,
  created_at timestamptz default now(),
  notify_enabled boolean default false,
  notify_frequency text default 'daily'
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  owner_id uuid references profiles(id),
  input_type text,
  input_summary text,
  scores jsonb,
  verdict text,
  report_markdown text,
  claims jsonb,
  fingerprint text,
  is_flagged boolean default false
);

create table trending_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  reason text,
  fingerprint text,
  sample_claims jsonb,
  score_fake_probability int,
  occurrences int default 1,
  last_seen timestamptz default now()
);

-- ===== RLS policies =====

-- PROFILES
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Service role can manage all profiles"
  on profiles for all using (auth.role() = 'service_role');

-- Allow upsert from auth callback (insert own row)
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- ANALYSES
alter table analyses enable row level security;

-- Anyone (anon) can insert via the API route (service_role key is used server-side)
create policy "Service role can manage all analyses"
  on analyses for all using (auth.role() = 'service_role');

create policy "Users can read own analyses"
  on analyses for select using (auth.uid() = owner_id);

-- TRENDING_ITEMS
alter table trending_items enable row level security;

-- Public read (anon can see trending)
create policy "Anyone can read trending items"
  on trending_items for select using (true);

-- Only service role writes
create policy "Service role can manage trending items"
  on trending_items for all using (auth.role() = 'service_role');

-- SUBSCRIBERS (newsletter / alerts)
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  whatsapp text,
  created_at timestamptz default now(),
  last_active timestamptz
);

alter table subscribers enable row level security;

-- Only service role manages subscribers
create policy "Service role can manage all subscribers"
  on subscribers for all using (auth.role() = 'service_role');

-- Note: You need to run recommended Supabase auth setup and link profile IDs with auth.users.id
