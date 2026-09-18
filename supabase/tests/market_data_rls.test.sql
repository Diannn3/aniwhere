begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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

select has_schema('private', 'private schema exists for privileged helpers');
select has_function('private', 'can_edit_place', array['uuid'], 'private.can_edit_place helper exists');
select has_function('private', 'set_updated_at', array[]::text[], 'private.set_updated_at helper exists');

select ok(
  not has_function_privilege('anon', 'private.can_edit_place(uuid)', 'EXECUTE'),
  'anon cannot execute private.can_edit_place'
);

select ok(
  has_function_privilege('authenticated', 'private.can_edit_place(uuid)', 'EXECUTE'),
  'authenticated users can invoke private.can_edit_place from RLS policies'
);

select ok(
  not has_function_privilege('authenticated', 'private.set_updated_at()', 'EXECUTE'),
  'authenticated users cannot directly execute timestamp trigger helper'
);

select ok(
  (select count(*) >= 4 from pg_policies where schemaname = 'public' and tablename = 'offers'),
  'offers has separate public-read and assigned-editor policies'
);

select * from finish();
rollback;
