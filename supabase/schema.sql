-- =============================================================================
-- NeuroWrite AI — Supabase Database Schema & Row-Level Security (RLS)
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE (Linked with Supabase auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  institution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Allow users to view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Allow users to insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Automatically create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, institution)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'institution'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SCREENINGS TABLE (page-level screening results)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.screenings (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  date date default current_date,
  subject text default 'Handwriting sample',
  filename text,
  category text not null check (category in ('Elevated', 'Typical')),
  risk_score numeric(6, 4) not null,
  risk_percentage numeric(5, 2),
  uncertainty_band jsonb,
  screening_classification text,
  per_fold_predictions jsonb,
  models_in_ensemble integer,
  ink_mass_fraction numeric(6, 4),
  backbone text,
  status text default 'Completed' check (status in ('Flagged', 'Completed')),
  notes text,
  original_image_base64 text,
  preview_image_base64 text,
  attention_overlay_base64 text,
  gradcam_overlay_base64 text,
  ig_overlay_base64 text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_screenings_user_id on public.screenings(user_id);
create index if not exists idx_screenings_created_at on public.screenings(created_at desc);
create index if not exists idx_screenings_category on public.screenings(category);

-- Enable RLS
alter table public.screenings enable row level security;

-- Policies for screenings
create policy "Allow users to view their own screenings"
  on public.screenings for select
  using (auth.uid() = user_id);

create policy "Allow authenticated users to insert screenings"
  on public.screenings for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update their own screenings"
  on public.screenings for update
  using (auth.uid() = user_id);

create policy "Allow users to delete their own screenings"
  on public.screenings for delete
  using (auth.uid() = user_id);
