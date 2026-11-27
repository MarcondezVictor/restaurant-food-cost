-- R2: access.accept_invites() turns only valid invites for the confirmed e-mail into memberships.
begin;

select plan(19);

insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('7e570000-0000-0000-0011-000000000001', 'pgtap-owner@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0011-000000000003', 'pgtap-manager@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0022-000000000001', 'pgtap-owner@restaurante-y.test', now(), 'authenticated', 'authenticated'),
  -- invited users
  ('7e570000-0000-0000-0044-000000000001', 'pgtap-cook@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0044-000000000002', 'pgtap-Mixed.Case@Restaurante-X.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0044-000000000003', 'pgtap-unconfirmed@restaurante-x.test', null, 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0044-000000000004', 'pgtap-revoked@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0044-000000000005', 'pgtap-expired@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('7e570000-0000-0000-0044-000000000006', 'pgtap-nobody@restaurante-x.test', now(), 'authenticated', 'authenticated');

insert into public.companies (id, name) values
  ('7e570000-0000-0000-00aa-000000000001', 'Restaurante X'),
  ('7e570000-0000-0000-00bb-000000000001', 'Restaurante Y');

insert into public.memberships (company_id, user_id, role) values
  ('7e570000-0000-0000-00aa-000000000001', '7e570000-0000-0000-0011-000000000001', 'owner'),
  ('7e570000-0000-0000-00aa-000000000001', '7e570000-0000-0000-0011-000000000003', 'manager'),
  ('7e570000-0000-0000-00bb-000000000001', '7e570000-0000-0000-0022-000000000001', 'owner');

insert into public.invites (company_id, email, role, invited_by, expires_at, revoked_at) values
  -- cook: valid in A and in B
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-cook@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001', now() + interval '7 days', null),
  ('7e570000-0000-0000-00bb-000000000001', 'pgtap-cook@restaurante-x.test', 'admin', '7e570000-0000-0000-0022-000000000001', now() + interval '7 days', null),
  -- invite for someone else, never for pgtap-nobody@
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-someone-else@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001', now() + interval '7 days', null),
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-mixed.case@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001', now() + interval '7 days', null),
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-unconfirmed@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001', now() + interval '7 days', null),
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-revoked@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001', now() + interval '7 days', now()),
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-expired@restaurante-x.test', 'chef', '7e570000-0000-0000-0011-000000000001', now() - interval '1 second', null),
  -- the manager is invited again, as admin
  ('7e570000-0000-0000-00aa-000000000001', 'pgtap-manager@restaurante-x.test', 'admin', '7e570000-0000-0000-0011-000000000001', now() + interval '7 days', null);

-- ---------------------------------------------------------------------------
-- A valid invite becomes a membership, once
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000001","role":"authenticated"}';
select is(public.accept_my_invites(), 2, 'cook accepts the two valid invites (A and B)');
select is(access.accept_invites(), 0, 'accepting again accepts nothing');
select results_eq(
  $$select c.name, m.role::text from public.memberships m join public.companies c on c.id = m.company_id
    where m.user_id = '7e570000-0000-0000-0044-000000000001' order by c.name$$,
  $$values ('Restaurante X', 'chef'), ('Restaurante Y', 'admin')$$,
  'cook is chef in A and admin in B, with the invited roles'
);
reset role;

select is(
  (select count(*) from public.memberships where user_id = '7e570000-0000-0000-0044-000000000001'),
  2::bigint,
  'accepting twice creates no duplicate membership'
);
select is(
  (select count(*) from public.invites where email = 'pgtap-cook@restaurante-x.test' and accepted_at is not null),
  2::bigint,
  'both invites are marked accepted'
);

-- ---------------------------------------------------------------------------
-- Invites that must not be accepted
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000006","role":"authenticated"}';
select is(access.accept_invites(), 0, 'an invite for another e-mail is not accepted');
reset role;
select is(
  (select accepted_at from public.invites where email = 'pgtap-someone-else@restaurante-x.test'),
  null,
  'the other e-mail invite stays pending'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000004","role":"authenticated"}';
select is(access.accept_invites(), 0, 'a revoked invite is not accepted');
reset role;
select is(
  (select count(*) from public.memberships where user_id = '7e570000-0000-0000-0044-000000000004'),
  0::bigint,
  'no membership from a revoked invite'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000005","role":"authenticated"}';
select is(access.accept_invites(), 0, 'an expired invite is not accepted');
reset role;
select is(
  (select count(*) from public.memberships where user_id = '7e570000-0000-0000-0044-000000000005'),
  0::bigint,
  'no membership from an expired invite'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000003","role":"authenticated"}';
select is(access.accept_invites(), 0, 'an unconfirmed e-mail accepts nothing');
reset role;
select is(
  (select accepted_at from public.invites where email = 'pgtap-unconfirmed@restaurante-x.test'),
  null,
  'the invite of an unconfirmed e-mail stays pending'
);

-- A JWT claim with another e-mail does not matter: the e-mail comes from auth.users.
set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000006","role":"authenticated","email":"pgtap-someone-else@restaurante-x.test"}';
select is(access.accept_invites(), 0, 'the e-mail claim in the JWT is ignored');
reset role;

-- ---------------------------------------------------------------------------
-- Case-insensitive match
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0044-000000000002","role":"authenticated"}';
select is(access.accept_invites(), 1, 'the e-mail matches case-insensitively');
reset role;

-- ---------------------------------------------------------------------------
-- An existing membership keeps its role
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-0000-0011-000000000003","role":"authenticated"}';
select is(access.accept_invites(), 1, 'the manager invite as admin is consumed');
reset role;
select is(
  (select role::text from public.memberships
   where user_id = '7e570000-0000-0000-0011-000000000003' and company_id = '7e570000-0000-0000-00aa-000000000001'),
  'manager',
  'an existing membership never changes role'
);

-- ---------------------------------------------------------------------------
-- No session, no effect
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
select is(access.accept_invites(), 0, 'without a user id nothing is accepted');
reset role;

select ok(
  (select prosecdef from pg_proc where oid = 'public.accept_my_invites()'::regprocedure) = false,
  'the public wrapper is security invoker'
);

select * from finish();
rollback;
