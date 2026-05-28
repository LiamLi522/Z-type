-- z-type safe Supabase setup
-- Run this whole file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  default_font_id text default 'kaiti',
  default_layout text default 'focus',
  locale text default 'zh-CN',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.copybooks (
  id uuid primary key default gen_random_uuid()
);

alter table public.copybooks add column if not exists user_id uuid references auth.users on delete cascade;
alter table public.copybooks add column if not exists title text;
alter table public.copybooks add column if not exists content text;
alter table public.copybooks add column if not exists font_id text;
alter table public.copybooks add column if not exists layout_mode text default 'focus';
alter table public.copybooks add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.copybooks add column if not exists created_at timestamptz default now();
alter table public.copybooks add column if not exists updated_at timestamptz default now();

create table if not exists public.font_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  favorite_font_ids text[] default '{}'::text[],
  recent_font_ids text[] default '{}'::text[],
  default_font_id text default 'kaiti',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  email_enabled boolean default true,
  in_app_enabled boolean default true,
  weekly_digest boolean default false,
  tags jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_font_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  source_text text,
  source_font_id text,
  suggested_font_id text,
  suggested_layout text,
  provider text default 'heuristic',
  status text default 'queued',
  result jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  plan_code text default 'free',
  status text default 'inactive',
  renew_at timestamptz,
  cancel_at timestamptz,
  provider_meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists font_preferences_user_id_key on public.font_preferences (user_id);
create unique index if not exists notification_preferences_user_id_key on public.notification_preferences (user_id);
create unique index if not exists subscriptions_user_id_key on public.subscriptions (user_id);
create index if not exists copybooks_user_created_idx on public.copybooks (user_id, created_at desc);
create index if not exists ai_font_jobs_user_created_idx on public.ai_font_jobs (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.copybooks enable row level security;
alter table public.font_preferences enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.ai_font_jobs enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists copybooks_read_own on public.copybooks;
create policy copybooks_read_own on public.copybooks for select using (auth.uid() = user_id);
drop policy if exists copybooks_insert_own on public.copybooks;
create policy copybooks_insert_own on public.copybooks for insert with check (auth.uid() = user_id);
drop policy if exists copybooks_update_own on public.copybooks;
create policy copybooks_update_own on public.copybooks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists copybooks_delete_own on public.copybooks;
create policy copybooks_delete_own on public.copybooks for delete using (auth.uid() = user_id);

drop policy if exists font_preferences_read_own on public.font_preferences;
create policy font_preferences_read_own on public.font_preferences for select using (auth.uid() = user_id);
drop policy if exists font_preferences_insert_own on public.font_preferences;
create policy font_preferences_insert_own on public.font_preferences for insert with check (auth.uid() = user_id);
drop policy if exists font_preferences_update_own on public.font_preferences;
create policy font_preferences_update_own on public.font_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notification_preferences_read_own on public.notification_preferences;
create policy notification_preferences_read_own on public.notification_preferences for select using (auth.uid() = user_id);
drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences for insert with check (auth.uid() = user_id);
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_font_jobs_read_own on public.ai_font_jobs;
create policy ai_font_jobs_read_own on public.ai_font_jobs for select using (auth.uid() = user_id);
drop policy if exists ai_font_jobs_insert_own on public.ai_font_jobs;
create policy ai_font_jobs_insert_own on public.ai_font_jobs for insert with check (auth.uid() = user_id);
drop policy if exists ai_font_jobs_update_own on public.ai_font_jobs;
create policy ai_font_jobs_update_own on public.ai_font_jobs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own on public.subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own on public.subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.copybooks to authenticated;
grant select, insert, update, delete on public.font_preferences to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.ai_font_jobs to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
