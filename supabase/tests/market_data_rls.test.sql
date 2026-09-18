begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'organizations has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.organization_memberships'::regclass),
  'organization_memberships has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sources'::regclass),
  'sources has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.places'::regclass),
  'places has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.place_editors'::regclass),
  'place_editors has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.place_crop_capabilities'::regclass),
  'place_crop_capabilities has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.offers'::regclass),
  'offers has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.verifications'::regclass),
  'verifications has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.reference_prices'::regclass),
  'reference_prices has RLS enabled'
);

select has_function('public', 'can_edit_place', array['uuid'], 'can_edit_place helper exists');

select ok(
  (select count(*) >= 4 from pg_policies where schemaname = 'public' and tablename = 'offers'),
  'offers has separate public-read and assigned-editor policies'
);

select * from finish();
rollback;
