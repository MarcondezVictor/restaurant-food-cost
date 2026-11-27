-- R2: company isolation, anon, non-members, and the access helpers.
begin;

select plan(31);

-- Synthetic setup (as postgres): two companies, four members of A, one owner of B, one outsider.
insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('7e570000-0000-0000-0011-000000000001', 'pgtap-owner@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0011-000000000002', 'pgtap-admin@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0011-000000000003', 'pgtap-manager@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0011-000000000004', 'pgtap-chef@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0022-000000000001', 'pgtap-owner@restaurante-y.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0033-000000000001', 'pgtap-outsider@restaurante-x.test', now(), 'authenticated', 'authenticated');

insert into public.companies (id, name) values
  ('7e570000-0000-0000-00aa-000000000001', 'Restaurante X'),
  ('7e570000-0000-0000-00bb-000000000001', 'Restaurante Y');

insert into public.memberships (company_id, user_id, role) values
  ('7e570000-0000-0000-00aa-000000000001', '7e570000-0000-0000-0011-000000000001', 'owner'),
  ('7e570000-0000-0000-00aa-000000000001', '7e570000-0000-0000-0011-000000000002', 'admin'),
  ('7e570000-0000-0000-00aa-000000000001', '7e570000-0000-0000-0011-000000000003', 'manager'),
  ('7e570000-0000-0000-00aa-000000000001', '7e570000-0000-0000-0011-000000000004', 'chef'),
  ('7e570000-0000-0000-00bb-000000000001', '7e570000-0000-0000-0022-000000000001', 'owner');

insert into public.invites (company_id, email, role, invited_by) values
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-new-a@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001'),
  ('7e570000-0000-0000-00bb-000000000001', 'pgtap-new-b@restaurante-y.test', 'chef', '7e570000-0000-0000-0022-000000000001');

-- ---------------------------------------------------------------------------
-- RLS is on, and anon has no grants at all
-- ---------------------------------------------------------------------------

select ok((select relrowsecurity from pg_class where oid = 'public.companies'::regclass), 'RLS on companies');
select ok((select relrowsecurity from pg_class where oid = 'public.memberships'::regclass), 'RLS on memberships');
select ok((select relrowsecurity from pg_class where oid = 'public.invites'::regclass), 'RLS on invites');

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('companies', 'memberships', 'invites')
      and privilege_type = 'DELETE'
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ),
  'no API role has a delete grant on the three tables'
);

-- ---------------------------------------------------------------------------
-- Owner of A: sees A only
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0011-000000000001","role":"authenticated"}';

select results_eq(
  'select name from public.companies',
  array['Restaurante X'],
  'owner of A sees only company A'
);
select is((select count(*) from public.memberships), 4::bigint, 'owner of A sees the 4 memberships of A');
select is(
  (select count(*) from public.memberships where company_id = '7e570000-0000-0000-00bb-000000000001'),
  0::bigint,
  'owner of A reads zero memberships of B'
);
select results_eq(
  'select email from public.invites',
  array['pgtap-new-a@restaurante-x.test'],
  'owner of A sees only the invites of A'
);

reset role;

-- ---------------------------------------------------------------------------
-- Owner of B: reads zero rows of A in every table
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0022-000000000001","role":"authenticated"}';

select is(
  (select count(*) from public.companies where id = '7e570000-0000-0000-00aa-000000000001'),
  0::bigint,
  'owner of B reads zero companies of A'
);
select is(
  (select count(*) from public.memberships where company_id = '7e570000-0000-0000-00aa-000000000001'),
  0::bigint,
  'owner of B reads zero memberships of A'
);
select is(
  (select count(*) from public.invites where company_id = '7e570000-0000-0000-00aa-000000000001'),
  0::bigint,
  'owner of B reads zero invites of A'
);
select ok(not access.is_member('7e570000-0000-0000-00aa-000000000001'), 'is_member(A) is false for the owner of B');

reset role;

-- ---------------------------------------------------------------------------
-- Manager and chef of A: see the company and members, not the invites
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0011-000000000003","role":"authenticated"}';

select is((select count(*) from public.companies), 1::bigint, 'manager of A sees company A');
select is((select count(*) from public.invites), 0::bigint, 'manager of A reads no invites');

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0011-000000000004","role":"authenticated"}';

select is((select count(*) from public.invites), 0::bigint, 'chef of A reads no invites');

reset role;

-- ---------------------------------------------------------------------------
-- Non-member (signed in, no membership): reads nothing, helpers say false
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0033-000000000001","role":"authenticated"}';

select is((select count(*) from public.companies), 0::bigint, 'non-member reads zero companies');
select is((select count(*) from public.memberships), 0::bigint, 'non-member reads zero memberships');
select is((select count(*) from public.invites), 0::bigint, 'non-member reads zero invites');
select ok(not access.is_member('7e570000-0000-0000-00aa-000000000001'), 'is_member is false for a non-member');
select ok(
  not access.has_role('7e570000-0000-0000-00aa-000000000001', 'owner', 'admin', 'manager', 'chef'),
  'has_role is false for a non-member, whatever the roles'
);

reset role;

-- ---------------------------------------------------------------------------
-- has_role: explicit roles, no hierarchy
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0011-000000000001","role":"authenticated"}';

select ok(access.has_role('7e570000-0000-0000-00aa-000000000001', 'owner'), 'owner has_role owner');
select ok(not access.has_role('7e570000-0000-0000-00aa-000000000001', 'admin'), 'owner is not admin (no hierarchy)');

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0011-000000000002","role":"authenticated"}';

select ok(access.has_role('7e570000-0000-0000-00aa-000000000001', 'owner', 'admin'), 'admin matches has_role(owner, admin)');

reset role;

-- ---------------------------------------------------------------------------
-- anon: no table access, no access functions
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '';

select throws_ok('select 1 from public.companies', '42501', null, 'anon cannot read companies');
select throws_ok('select 1 from public.memberships', '42501', null, 'anon cannot read memberships');
select throws_ok('select 1 from public.invites', '42501', null, 'anon cannot read invites');
select throws_ok(
  $$select access.is_member('7e570000-0000-0000-00aa-000000000001')$$,
  '42501', null, 'anon cannot execute access.is_member'
);
select throws_ok(
  $$select access.has_role('7e570000-0000-0000-00aa-000000000001', 'owner')$$,
  '42501', null, 'anon cannot execute access.has_role'
);
select throws_ok('select access.accept_invites()', '42501', null, 'anon cannot execute access.accept_invites');
select throws_ok('select public.accept_my_invites()', '42501', null, 'anon cannot execute public.accept_my_invites');

reset role;

-- The function grants themselves, independent of schema usage.
select ok(
  not has_function_privilege('anon', 'access.accept_invites()', 'execute')
  and not has_function_privilege('anon', 'access.is_member(uuid)', 'execute')
  and not has_function_privilege('anon', 'access.has_role(uuid, public.member_role[])', 'execute'),
  'anon has no execute grant on any access function'
);

select * from finish();
rollback;
