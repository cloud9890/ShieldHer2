-- supabase/schema.sql
-- ShieldHer complete database schema
-- Run this in Supabase SQL Editor to set up / reset the entire backend

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users not null primary key,
  name         text,
  phone        text,
  shake_on     boolean default true,
  notif_on     boolean default true,
  guard_on     boolean default true,
  biometric_on boolean default false,   -- ✅ ADDED: vault biometric lock toggle
  avatar_url   text,
  updated_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

alter publication supabase_realtime add table profiles;

-- Migration for existing databases: add biometric_on if missing
alter table public.profiles add column if not exists biometric_on boolean default false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INCIDENTS (Evidence Vault)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.incidents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  type        text not null default 'Other',
  description text,
  location    text,
  media_url   text,      -- Supabase Storage public URL (photo / audio)
  complaint   text,      -- AI-generated FIR draft
  created_at  timestamptz default now()
);

alter table public.incidents enable row level security;

create policy "Users see own incidents"    on incidents for select  using (auth.uid() = user_id);
create policy "Users insert own incidents" on incidents for insert  with check (auth.uid() = user_id);
create policy "Users update own incidents" on incidents for update  using (auth.uid() = user_id);
create policy "Users delete own incidents" on incidents for delete  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONTACTS (SafeCircle — replaces AsyncStorage, survives reinstalls)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  phone      text not null,
  relation   text,
  created_at timestamptz default now()
);

alter table public.contacts enable row level security;

create policy "Users see own contacts"    on contacts for select  using (auth.uid() = user_id);
create policy "Users insert own contacts" on contacts for insert  with check (auth.uid() = user_id);
create policy "Users delete own contacts" on contacts for delete  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LIVE SESSIONS (Real-time escort location tracking)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.live_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  lat         double precision,
  lng         double precision,
  is_active   boolean default true,
  started_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.live_sessions enable row level security;

-- Sessions are publicly readable (anyone with the session ID / tracking link can view)
create policy "Public read live sessions"    on live_sessions for select  using (true);
create policy "Owner insert live session"    on live_sessions for insert  with check (auth.uid() = user_id);
create policy "Owner update live session"    on live_sessions for update  using (auth.uid() = user_id);

-- Enable realtime so the track web page gets instant updates without polling
alter publication supabase_realtime add table live_sessions;

-- TODO: Add a pg_cron job or Edge Function to purge sessions where
--       is_active = false AND updated_at < now() - interval '24 hours'


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. COMMUNITY REPORTS
-- ─────────────────────────────────────────────────────────────────────────────
-- (Created by community_reports_migration.sql — reproduced here for completeness)
-- create table if not exists public.community_reports ( ... );

-- ✅ Performance index — speeds up the common "latest reports" query used
--    by HomeScreen, NearbyScreen, and SafeCircleScreen
create index if not exists idx_community_reports_created
  on public.community_reports (created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

-- Avatar bucket (public — profile pictures)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Users can update own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid() = owner);

-- Evidence bucket (private — incident photos / audio)
insert into storage.buckets (id, name, public)
  values ('evidence', 'evidence', false)
  on conflict (id) do nothing;

create policy "Evidence is readable by owner"
  on storage.objects for select
  using (bucket_id = 'evidence' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated users can upload evidence"
  on storage.objects for insert
  with check (bucket_id = 'evidence' and auth.role() = 'authenticated');

create policy "Owner can delete evidence"
  on storage.objects for delete
  using (bucket_id = 'evidence' and auth.uid()::text = (storage.foldername(name))[1]);


