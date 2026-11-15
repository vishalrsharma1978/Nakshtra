-- Nakshtra initial schema
-- Roles, profiles, experts, forum questions with SLA, chat messages,
-- video consultations, payments, horoscopes, settings, activity log.

create extension if not exists pgcrypto;

-- ===== Enums =====
create type public.user_role as enum ('user', 'expert', 'admin');
create type public.question_tier as enum ('free', 'paid');
create type public.question_status as enum ('open', 'assigned', 'answered', 'closed');
create type public.consult_status as enum ('pending_payment', 'booked', 'completed', 'cancelled');
create type public.payment_status as enum ('created', 'paid', 'failed', 'refunded');
create type public.payment_purpose as enum ('question_fast_track', 'consultation');

-- ===== Profiles =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role public.user_role not null default 'user',
  language text not null default 'en' check (language in ('en', 'hi')),
  dob date,
  birth_time time,
  birth_place text,
  zodiac_sign text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper functions (security definer so RLS policies can use them)
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user'::public.user_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() = 'admin'; $$;

create or replace function public.is_expert()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() in ('expert', 'admin'); $$;

-- ===== Experts (consultant directory, managed by admin) =====
create table public.experts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  bio text,
  photo_url text,
  specialties text[] not null default '{}',
  languages text[] not null default '{en}',
  experience_years int not null default 0,
  consult_rate_inr int not null default 499,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== App settings (admin-configurable) =====
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('free_sla_hours', '48'),
  ('paid_sla_hours', '4'),
  ('fast_track_price_inr', '199'),
  ('default_consult_rate_inr', '499'),
  ('default_consult_duration_min', '30'),
  ('razorpay_key_id', '""'),
  ('forum_enabled', 'true'),
  ('consult_enabled', 'true');

-- ===== Forum questions with SLA =====
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'other',
  title text not null check (char_length(title) between 3 and 200),
  body text not null check (char_length(body) between 10 and 5000),
  tier public.question_tier not null default 'free',
  status public.question_status not null default 'open',
  sla_due_at timestamptz not null,
  assigned_expert_id uuid references public.experts (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index questions_user_idx on public.questions (user_id);
create index questions_status_sla_idx on public.questions (status, sla_due_at);

create table public.question_messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index question_messages_question_idx on public.question_messages (question_id, created_at);

-- When an expert/admin replies, mark question answered
create or replace function public.handle_expert_reply()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  sender_role public.user_role;
begin
  select role into sender_role from public.profiles where id = new.sender_id;
  if sender_role in ('expert', 'admin') then
    update public.questions
      set status = 'answered', answered_at = coalesce(answered_at, now())
      where id = new.question_id and status in ('open', 'assigned');
  end if;
  return new;
end;
$$;

create trigger on_question_message_insert
  after insert on public.question_messages
  for each row execute function public.handle_expert_reply();

-- ===== Consultations (1-to-1 video) =====
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expert_id uuid not null references public.experts (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int not null default 30,
  status public.consult_status not null default 'pending_payment',
  jitsi_room text not null default encode(gen_random_bytes(12), 'hex'),
  amount_inr int not null,
  payment_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index consultations_user_idx on public.consultations (user_id);
create index consultations_expert_idx on public.consultations (expert_id, scheduled_at);

-- ===== Payments =====
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose public.payment_purpose not null,
  ref_id uuid not null,
  amount_inr int not null check (amount_inr > 0),
  currency text not null default 'INR',
  razorpay_order_id text unique,
  razorpay_payment_id text,
  razorpay_signature text,
  status public.payment_status not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_user_idx on public.payments (user_id);

-- ===== Horoscopes (daily content per sign/language) =====
create table public.horoscopes (
  id uuid primary key default gen_random_uuid(),
  sign text not null,
  for_date date not null default current_date,
  language text not null default 'en' check (language in ('en', 'hi')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (sign, for_date, language)
);

-- ===== Activity log (user tracking for admin) =====
create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_log_user_idx on public.activity_log (user_id, created_at desc);

-- ===== Row Level Security =====
alter table public.profiles enable row level security;
alter table public.experts enable row level security;
alter table public.app_settings enable row level security;
alter table public.questions enable row level security;
alter table public.question_messages enable row level security;
alter table public.consultations enable row level security;
alter table public.payments enable row level security;
alter table public.horoscopes enable row level security;
alter table public.activity_log enable row level security;

-- Profiles: own row read/update; admins read/update all
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (
    (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
    or public.is_admin()
  );

-- Experts: everyone authenticated can browse active experts; admin manages
create policy "experts_select_active" on public.experts
  for select using (is_active or public.is_admin() or profile_id = auth.uid());
create policy "experts_admin_all" on public.experts
  for all using (public.is_admin()) with check (public.is_admin());

-- Settings: all authenticated can read; admin writes
create policy "settings_select" on public.app_settings
  for select using (auth.uid() is not null);
create policy "settings_admin_write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Questions: owner CRUD-ish; experts/admins see all (to answer)
create policy "questions_select" on public.questions
  for select using (user_id = auth.uid() or public.is_expert());
create policy "questions_insert_own" on public.questions
  for insert with check (user_id = auth.uid());
create policy "questions_update" on public.questions
  for update using (user_id = auth.uid() or public.is_expert());

-- Messages: participants of the question
create policy "messages_select" on public.question_messages
  for select using (
    public.is_expert()
    or exists (select 1 from public.questions q where q.id = question_id and q.user_id = auth.uid())
  );
create policy "messages_insert" on public.question_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_expert()
      or exists (select 1 from public.questions q where q.id = question_id and q.user_id = auth.uid())
    )
  );

-- Consultations: owner + the expert + admin
create policy "consults_select" on public.consultations
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.experts e where e.id = expert_id and e.profile_id = auth.uid())
  );
create policy "consults_insert_own" on public.consultations
  for insert with check (user_id = auth.uid());
create policy "consults_update" on public.consultations
  for update using (user_id = auth.uid() or public.is_admin());

-- Payments: owner read; writes happen via service role (edge functions) only
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

-- Horoscopes: public read; admin writes
create policy "horoscopes_select" on public.horoscopes for select using (true);
create policy "horoscopes_admin_write" on public.horoscopes
  for all using (public.is_admin()) with check (public.is_admin());

-- Activity log: users insert their own events; admins read
create policy "activity_insert_own" on public.activity_log
  for insert with check (user_id = auth.uid());
create policy "activity_admin_select" on public.activity_log
  for select using (public.is_admin());

-- ===== Realtime =====
alter publication supabase_realtime add table public.question_messages;
alter publication supabase_realtime add table public.questions;
