-- SilentSOS database
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  audio_path text,
  status text not null default 'triggered',
  created_at timestamptz not null default now()
);

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sos_id uuid references public.sos_alerts(id) on delete cascade,
  recipient text not null,
  status text not null,
  textbee_batch_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.sos_alerts enable row level security;
alter table public.sms_logs enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own contacts" on public.emergency_contacts;
create policy "own contacts" on public.emergency_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own alerts" on public.sos_alerts;
create policy "own alerts" on public.sos_alerts for select using (auth.uid() = user_id);

drop policy if exists "own sms logs" on public.sms_logs;
create policy "own sms logs" on public.sms_logs for select using (auth.uid() = user_id);

-- Create a profile automatically for every new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Private audio bucket.
insert into storage.buckets (id, name, public)
values ('sos-audio', 'sos-audio', false)
on conflict (id) do nothing;

drop policy if exists "users upload own sos audio" on storage.objects;
create policy "users upload own sos audio"
on storage.objects for insert to authenticated
with check (bucket_id = 'sos-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users read own sos audio" on storage.objects;
create policy "users read own sos audio"
on storage.objects for select to authenticated
using (bucket_id = 'sos-audio' and (storage.foldername(name))[1] = auth.uid()::text);
