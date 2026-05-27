-- z-type core schema

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
  user_id uuid not null references auth.users on delete cascade,
  favorite_font_ids text[] not null default '{}'::text[],
  recent_font_ids text[] not null default '{}'::text[],
  default_font_id text not null default 'kaiti',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
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
  user_id uuid not null references auth.users on delete cascade,
  plan_code text not null default 'free',
  status text not null default 'inactive',
  renew_at timestamptz,
  cancel_at timestamptz,
  provider_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.copybooks enable row level security;
alter table public.font_preferences enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.ai_font_jobs enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_write_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "copybooks_read_own" on public.copybooks
  for select using (auth.uid() = user_id);

create policy "copybooks_write_own" on public.copybooks
  for insert with check (auth.uid() = user_id);

create policy "copybooks_update_own" on public.copybooks
  for update using (auth.uid() = user_id);

create policy "font_preferences_read_own" on public.font_preferences
  for select using (auth.uid() = user_id);

create policy "font_preferences_write_own" on public.font_preferences
  for insert with check (auth.uid() = user_id);

create policy "font_preferences_update_own" on public.font_preferences
  for update using (auth.uid() = user_id);

create policy "notification_preferences_read_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "notification_preferences_write_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id);

create policy "ai_font_jobs_read_own" on public.ai_font_jobs
  for select using (auth.uid() = user_id);

create policy "ai_font_jobs_write_own" on public.ai_font_jobs
  for insert with check (auth.uid() = user_id);

create policy "ai_font_jobs_update_own" on public.ai_font_jobs
  for update using (auth.uid() = user_id);

create policy "subscriptions_read_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subscriptions_write_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);
