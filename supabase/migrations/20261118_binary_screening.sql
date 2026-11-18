-- Align an existing `screenings` table with the binary screening contract.
--
-- The UI and the API now store one page-level risk score. The old three-class
-- columns (`confidence`, `probabilities`) and the "Verified" status are
-- removed. Run this once against an existing database; fresh databases can use
-- schema.sql directly.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Align `profiles` with reality: no role, no cohort, no fabricated defaults.
-- Runs before the screenings section because the signup trigger is replaced.
-- ─────────────────────────────────────────────────────────────────────────────

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

alter table public.profiles alter column name set default null;
alter table public.profiles alter column institution set default null;
alter table public.profiles drop column if exists role;
alter table public.profiles drop column if exists cohort;

-- ─────────────────────────────────────────────────────────────────────────────
-- Align `screenings` with the binary screening contract.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.screenings drop constraint if exists screenings_category_check;
alter table public.screenings drop constraint if exists screenings_status_check;

alter table public.screenings drop column if exists confidence;
alter table public.screenings drop column if exists probabilities;

alter table public.screenings add column if not exists risk_percentage numeric(5, 2);
alter table public.screenings add column if not exists per_fold_predictions jsonb;
alter table public.screenings add column if not exists models_in_ensemble integer;
alter table public.screenings add column if not exists ink_mass_fraction numeric(6, 4);
alter table public.screenings add column if not exists backbone text;

alter table public.screenings
  alter column uncertainty_band type jsonb
  using case when uncertainty_band is null then null else to_jsonb(uncertainty_band) end;

alter table public.screenings alter column subject set default 'Handwriting sample';
alter table public.screenings alter column filename drop default;

-- Existing Elevated rows must stay Elevated; only legacy Reversal maps up.
update public.screenings
set category = case
  when category in ('Reversal', 'Elevated') then 'Elevated'
  else 'Typical'
end;

-- Status follows the normalized category, so a mapped Reversal row is Flagged.
update public.screenings
set status = case when category = 'Elevated' then 'Flagged' else 'Completed' end;

alter table public.screenings
  add constraint screenings_category_check check (category in ('Elevated', 'Typical'));

alter table public.screenings
  add constraint screenings_status_check check (status in ('Flagged', 'Completed'));

-- Store the original image and model overlays for history viewing
alter table public.screenings add column if not exists original_image_base64 text;
alter table public.screenings add column if not exists preview_image_base64 text;
alter table public.screenings add column if not exists attention_overlay_base64 text;
alter table public.screenings add column if not exists gradcam_overlay_base64 text;
alter table public.screenings add column if not exists ig_overlay_base64 text;

drop policy if exists "Allow users to view their own screenings or public demo records"
  on public.screenings;

create policy "Allow users to view their own screenings"
  on public.screenings for select
  using (auth.uid() = user_id);

drop policy if exists "Allow authenticated users to insert screenings"
  on public.screenings;

create policy "Allow authenticated users to insert screenings"
  on public.screenings for insert
  with check (auth.uid() = user_id);

commit;
