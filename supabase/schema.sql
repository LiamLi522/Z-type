-- z-type Supabase schema

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  default_font_id text not null default 'kaiti',
  default_layout text not null default 'focus',
  locale text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copybooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  content text not null,
  font_id text not null,
  layout_mode text not null default 'focus',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.font_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  favorite_font_ids text[] not null default '{}'::text[],
  recent_font_ids text[] not null default '{}'::text[],
  default_font_id text not null default 'kaiti',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  weekly_digest boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_font_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  source_text text not null,
  source_font_id text not null,
  suggested_font_id text,
  suggested_layout text,
  provider text not null default 'heuristic',
  status text not null default 'queued',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  plan_code text not null default 'free',
  status text not null default 'inactive',
  renew_at timestamptz,
  cancel_at timestamptz,
  provider_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists copybooks_user_created_idx on public.copybooks (user_id, created_at desc);
create index if not exists ai_font_jobs_user_created_idx on public.ai_font_jobs (user_id, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_copybooks_updated_at on public.copybooks;
create trigger set_copybooks_updated_at
  before update on public.copybooks
  for each row execute function public.set_updated_at();

drop trigger if exists set_font_preferences_updated_at on public.font_preferences;
create trigger set_font_preferences_updated_at
  before update on public.font_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists set_ai_font_jobs_updated_at on public.ai_font_jobs;
create trigger set_ai_font_jobs_updated_at
  before update on public.ai_font_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.font_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

insert into public.font_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.copybooks enable row level security;
alter table public.font_preferences enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.ai_font_jobs enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists copybooks_read_own on public.copybooks;
create policy copybooks_read_own on public.copybooks
  for select using (auth.uid() = user_id);

drop policy if exists copybooks_insert_own on public.copybooks;
create policy copybooks_insert_own on public.copybooks
  for insert with check (auth.uid() = user_id);

drop policy if exists copybooks_update_own on public.copybooks;
create policy copybooks_update_own on public.copybooks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists copybooks_delete_own on public.copybooks;
create policy copybooks_delete_own on public.copybooks
  for delete using (auth.uid() = user_id);

drop policy if exists font_preferences_read_own on public.font_preferences;
create policy font_preferences_read_own on public.font_preferences
  for select using (auth.uid() = user_id);

drop policy if exists font_preferences_insert_own on public.font_preferences;
create policy font_preferences_insert_own on public.font_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists font_preferences_update_own on public.font_preferences;
create policy font_preferences_update_own on public.font_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notification_preferences_read_own on public.notification_preferences;
create policy notification_preferences_read_own on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_font_jobs_read_own on public.ai_font_jobs;
create policy ai_font_jobs_read_own on public.ai_font_jobs
  for select using (auth.uid() = user_id);

drop policy if exists ai_font_jobs_insert_own on public.ai_font_jobs;
create policy ai_font_jobs_insert_own on public.ai_font_jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists ai_font_jobs_update_own on public.ai_font_jobs;
create policy ai_font_jobs_update_own on public.ai_font_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.copybooks to authenticated;
grant select, insert, update, delete on public.font_preferences to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.ai_font_jobs to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
