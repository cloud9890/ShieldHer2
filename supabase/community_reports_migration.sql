-- supabase/community_reports_migration.sql
-- ShieldHer — Community Reports + Biometric Profile Field
-- Run this in the Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COMMUNITY REPORTS (Crowd-sourced safety alerts)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.community_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users,
  category    text not null default 'Suspicious Person',
  note        text default '',
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now()
);

alter table public.community_reports enable row level security;

-- All users can read (public crowd-sourced map)
create policy "Public read community reports"
  on community_reports for select using (true);

-- Authenticated users can insert
create policy "Authenticated users can report"
  on community_reports for insert
  with check (auth.role() = 'authenticated');

-- Only owner can delete their own report
create policy "Owner can delete own report"
  on community_reports for delete
  using (auth.uid() = user_id);

-- Enable Realtime for live map updates
alter publication supabase_realtime add table community_reports;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADD biometric_on COLUMN TO PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists biometric_on boolean default false;
