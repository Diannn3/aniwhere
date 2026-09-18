-- AniWhere market-data v2
-- Separates stable reviewed places from time-sensitive buyer demand.
-- Generated for the trust-model hardening pass on 2026-09-18.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('buyer', 'cooperative', 'lgu', 'program', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'steward', 'buyer_editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('buyer_offer', 'reviewed_place', 'public_reference', 'demo')),
  label text not null,
  url text,
  organization text,
  observed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  slug text not null unique,
  name text not null,
  category text not null check (category in ('cooperative', 'processor', 'market', 'msme', 'restaurant', 'consolidator')),
  municipality text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  description_en text,
  description_fil text,
  contact_phone text,
  contact_email text,
  public_status text not null default 'needs_review'
    check (public_status in ('reviewed', 'needs_review', 'archived')),
  source_id uuid references public.sources(id) on delete set null,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_editors (
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create table if not exists public.place_crop_capabilities (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  crop_key text not null,
  acceptance_state text not null default 'unknown'
    check (acceptance_state in ('accepted', 'excluded', 'unknown')),
  min_kg numeric check (min_kg is null or min_kg >= 0),
  max_kg numeric check (max_kg is null or max_kg >= 0),
  conditions_en jsonb not null default '[]'::jsonb,
  conditions_fil jsonb not null default '[]'::jsonb,
  source_id uuid references public.sources(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, crop_key),
  check (min_kg is null or max_kg is null or min_kg <= max_kg)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  crop_key text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'active', 'paused', 'expired', 'withdrawn')),
  min_kg numeric check (min_kg is null or min_kg >= 0),
  max_kg numeric check (max_kg is null or max_kg >= 0),
  price_per_kg numeric check (price_per_kg is null or price_per_kg >= 0),
  valid_from date not null,
  valid_until date not null,
  receiving_weekdays smallint[] check (
    receiving_weekdays is null
    or receiving_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  receiving_start_time time,
  receiving_end_time time,
  variety text,
  grade text,
  packaging text,
  notes text,
  source_id uuid references public.sources(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_from <= valid_until),
  check (min_kg is null or max_kg is null or min_kg <= max_kg)
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('place', 'offer', 'place_crop_capability')),
  entity_id uuid not null,
  status text not null check (status in ('verified', 'needs_reconfirmation', 'rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  verifier_label text,
  notes text,
  verified_at timestamptz not null default now()
);

create table if not exists public.reference_prices (
  id uuid primary key default gen_random_uuid(),
  crop_key text not null,
  geography text not null,
  price_type text not null check (price_type in ('farmgate_reference', 'retail_reference', 'historical_reference')),
  price_per_kg numeric not null check (price_per_kg >= 0),
  period_start date not null,
  period_end date not null,
  source_id uuid not null references public.sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (period_start <= period_end)
);

create index if not exists places_municipality_idx on public.places (municipality);
create index if not exists capabilities_place_crop_idx on public.place_crop_capabilities (place_id, crop_key);
create index if not exists offers_place_crop_status_idx on public.offers (place_id, crop_key, status);
create index if not exists offers_validity_idx on public.offers (valid_from, valid_until);
create index if not exists reference_prices_crop_period_idx on public.reference_prices (crop_key, period_start, period_end);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at before update on public.places
for each row execute function public.set_updated_at();

drop trigger if exists capabilities_set_updated_at on public.place_crop_capabilities;
create trigger capabilities_set_updated_at before update on public.place_crop_capabilities
for each row execute function public.set_updated_at();

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at before update on public.offers
for each row execute function public.set_updated_at();

create or replace function private.can_edit_place(target_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select
    (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.place_editors pe
        where pe.place_id = target_place_id
          and pe.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.places p
        join public.organization_memberships om
          on om.organization_id = p.organization_id
        where p.id = target_place_id
          and om.user_id = (select auth.uid())
          and om.role in ('admin', 'steward')
      )
    );
$;

revoke all on function private.can_edit_place(uuid) from public;
grant execute on function private.can_edit_place(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.sources enable row level security;
alter table public.places enable row level security;
alter table public.place_editors enable row level security;
alter table public.place_crop_capabilities enable row level security;
alter table public.offers enable row level security;
alter table public.verifications enable row level security;
alter table public.reference_prices enable row level security;

revoke all on table
  public.organizations,
  public.profiles,
  public.organization_memberships,
  public.sources,
  public.places,
  public.place_editors,
  public.place_crop_capabilities,
  public.offers,
  public.verifications,
  public.reference_prices
from anon, authenticated;

grant select on public.organizations, public.sources, public.places,
  public.place_crop_capabilities, public.offers, public.reference_prices
to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.organization_memberships, public.place_editors to authenticated;
grant update on public.places, public.place_crop_capabilities to authenticated;
grant insert, update, delete on public.offers to authenticated;

drop policy if exists organizations_public_read on public.organizations;
create policy organizations_public_read
on public.organizations for select
to anon, authenticated
using (true);

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists memberships_read_self on public.organization_memberships;
create policy memberships_read_self
on public.organization_memberships for select
to authenticated
using (user_id = auth.uid());

drop policy if exists sources_public_read on public.sources;
create policy sources_public_read
on public.sources for select
to anon, authenticated
using (true);

drop policy if exists places_public_read on public.places;
create policy places_public_read
on public.places for select
to anon, authenticated
using (public_status = 'reviewed');

drop policy if exists places_assigned_read on public.places;
create policy places_assigned_read
on public.places for select
to authenticated
using (private.can_edit_place(id));

drop policy if exists places_assigned_update on public.places;
create policy places_assigned_update
on public.places for update
to authenticated
using (private.can_edit_place(id))
with check (private.can_edit_place(id));

drop policy if exists place_editors_read_self on public.place_editors;
create policy place_editors_read_self
on public.place_editors for select
to authenticated
using (user_id = auth.uid());

drop policy if exists capabilities_public_read on public.place_crop_capabilities;
create policy capabilities_public_read
on public.place_crop_capabilities for select
to anon, authenticated
using (
  exists (
    select 1 from public.places p
    where p.id = place_id and p.public_status = 'reviewed'
  )
);

drop policy if exists capabilities_assigned_read on public.place_crop_capabilities;
create policy capabilities_assigned_read
on public.place_crop_capabilities for select
to authenticated
using (private.can_edit_place(place_id));

drop policy if exists capabilities_assigned_update on public.place_crop_capabilities;
create policy capabilities_assigned_update
on public.place_crop_capabilities for update
to authenticated
using (private.can_edit_place(place_id))
with check (private.can_edit_place(place_id));

drop policy if exists offers_public_active_read on public.offers;
create policy offers_public_active_read
on public.offers for select
to anon, authenticated
using (
  status = 'active'
  and valid_from <= current_date
  and valid_until >= current_date
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.public_status = 'reviewed'
  )
);

drop policy if exists offers_assigned_read on public.offers;
create policy offers_assigned_read
on public.offers for select
to authenticated
using (private.can_edit_place(place_id));

drop policy if exists offers_assigned_insert on public.offers;
create policy offers_assigned_insert
on public.offers for insert
to authenticated
with check (
  private.can_edit_place(place_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists offers_assigned_update on public.offers;
create policy offers_assigned_update
on public.offers for update
to authenticated
using (private.can_edit_place(place_id))
with check (private.can_edit_place(place_id));

drop policy if exists offers_assigned_delete on public.offers;
create policy offers_assigned_delete
on public.offers for delete
to authenticated
using (private.can_edit_place(place_id));

drop policy if exists reference_prices_public_read on public.reference_prices;
create policy reference_prices_public_read
on public.reference_prices for select
to anon, authenticated
using (true);

-- Raw verification notes remain service-role only for now.
-- A later public security-invoker view can expose only safe provenance fields.
