-- IIT Dharwad Wellness Centre — Supabase PostgreSQL Schema & Row-Level Security
-- Run this script once in your Supabase Dashboard -> SQL Editor.

-- 1. Helper extensions
create extension if not exists pgcrypto;

-- 2. Profiles table (linked 1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  role text not null default 'student' check (role in ('student', 'doctor')),
  roll_number text not null default '',
  uhid text not null default '',
  hostel_or_dept text not null default '',
  linked_doctor_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Doctor Allowlist (email-keyed practitioner authorization)
create table if not exists public.doctor_allowlist (
  email text primary key,
  assigned_doctor_id text not null,
  doctor_name text not null,
  approved_by_uid uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. Doctor Verification Requests
create table if not exists public.doctor_requests (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  requested_doctor_id text not null,
  credentials text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Live Doctor OPD Duty Statuses (publicly readable)
create table if not exists public.doctor_statuses (
  doctor_id text primary key,
  availability_override text not null default 'auto'
    check (availability_override in ('auto', 'available', 'in_consultation', 'on_leave')),
  custom_note text not null default '',
  assigned_uid uuid references auth.users(id) on delete set null,
  updated_by_uid uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 6. Saturday SDM Visiting Specialist Roster (publicly readable)
create table if not exists public.specialist_roster (
  date_key text primary key,
  specialists text[] not null default '{}',
  time_window text not null default '3 PM – 5 PM',
  updated_by_uid uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 7. Student Appointments
create table if not exists public.appointments (
  id text primary key,
  student_uid uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_roll text not null default '',
  student_uhid text not null default '',
  doctor_id text not null,
  doctor_name text not null,
  doctor_spec text not null,
  assigned_doctor_uid uuid references auth.users(id) on delete set null,
  date text not null,
  time text not null,
  reason text not null default '',
  doctor_notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_student_uid on public.appointments(student_uid);
create index if not exists idx_appointments_assigned_doctor_uid on public.appointments(assigned_doctor_uid);

-- 8. Private Student Daily Mood Log
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_uid uuid not null references auth.users(id) on delete cascade,
  date text not null,
  score integer not null check (score between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_uid, date)
);

create index if not exists idx_moods_user_uid_date on public.moods(user_uid, date);

-- 9. Helper Functions for RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'email') = 'cs26bt042@iitdh.ac.in', false);
$$;

create or replace function public.is_verified_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.doctor_allowlist da
    where lower(da.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 10. Enable Row-Level Security on all tables
alter table public.profiles enable row level security;
alter table public.doctor_allowlist enable row level security;
alter table public.doctor_requests enable row level security;
alter table public.doctor_statuses enable row level security;
alter table public.specialist_roster enable row level security;
alter table public.appointments enable row level security;
alter table public.moods enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and (
      role = 'student'
      or (role = 'doctor' and public.is_verified_doctor())
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    (auth.uid() = id or public.is_admin())
    and (
      role = 'student'
      or (role = 'doctor' and public.is_verified_doctor())
    )
  );

-- Doctor allowlist policies
drop policy if exists "allowlist_select_own_or_admin" on public.doctor_allowlist;
create policy "allowlist_select_own_or_admin"
  on public.doctor_allowlist for select
  using (
    public.is_admin()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "allowlist_admin_manage" on public.doctor_allowlist;
create policy "allowlist_admin_manage"
  on public.doctor_allowlist for all
  using (public.is_admin())
  with check (public.is_admin());

-- Doctor verification requests policies
drop policy if exists "requests_select_own_or_admin" on public.doctor_requests;
create policy "requests_select_own_or_admin"
  on public.doctor_requests for select
  using (auth.uid() = uid or public.is_admin());

drop policy if exists "requests_insert_own" on public.doctor_requests;
create policy "requests_insert_own"
  on public.doctor_requests for insert
  with check (auth.uid() = uid and status = 'pending');

drop policy if exists "requests_update_admin" on public.doctor_requests;
create policy "requests_update_admin"
  on public.doctor_requests for update
  using (public.is_admin())
  with check (public.is_admin());

-- Doctor statuses policies (public read, verified doctor write)
drop policy if exists "doctor_statuses_public_read" on public.doctor_statuses;
create policy "doctor_statuses_public_read"
  on public.doctor_statuses for select
  using (true);

drop policy if exists "doctor_statuses_doctor_write" on public.doctor_statuses;
create policy "doctor_statuses_doctor_write"
  on public.doctor_statuses for all
  using (public.is_verified_doctor())
  with check (public.is_verified_doctor());

-- Specialist roster policies (public read, verified doctor write)
drop policy if exists "specialist_roster_public_read" on public.specialist_roster;
create policy "specialist_roster_public_read"
  on public.specialist_roster for select
  using (true);

drop policy if exists "specialist_roster_doctor_write" on public.specialist_roster;
create policy "specialist_roster_doctor_write"
  on public.specialist_roster for all
  using (public.is_verified_doctor())
  with check (public.is_verified_doctor());

-- Appointments policies
drop policy if exists "appointments_select_scoped" on public.appointments;
create policy "appointments_select_scoped"
  on public.appointments for select
  using (
    student_uid = auth.uid()
    or assigned_doctor_uid = auth.uid()
    or public.is_verified_doctor()
  );

drop policy if exists "appointments_insert_student" on public.appointments;
create policy "appointments_insert_student"
  on public.appointments for insert
  with check (student_uid = auth.uid() and status = 'pending');

drop policy if exists "appointments_update_scoped" on public.appointments;
create policy "appointments_update_scoped"
  on public.appointments for update
  using (
    student_uid = auth.uid()
    or assigned_doctor_uid = auth.uid()
    or public.is_verified_doctor()
  )
  with check (
    public.is_verified_doctor()
    or (student_uid = auth.uid() and status = 'cancelled')
  );

-- Moods policies (strictly private to owner)
drop policy if exists "moods_owner_all" on public.moods;
create policy "moods_owner_all"
  on public.moods for all
  using (user_uid = auth.uid())
  with check (user_uid = auth.uid());

-- 11. Enable Realtime publication
do $$
begin
  alter publication supabase_realtime add table public.doctor_statuses;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.specialist_roster;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.moods;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.doctor_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.doctor_allowlist;
exception when duplicate_object then null;
end $$;
