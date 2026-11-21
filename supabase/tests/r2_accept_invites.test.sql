-- R2: access.accept_invites() turns only valid invites for the confirmed e-mail into memberships.
begin;

select plan(19);

insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('11111111-0000-0000-0000-000000000001', 'owner@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000003', 'manager@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('22222222-0000-0000-0000-000000000001', 'owner@restaurante-y.test', now(), 'authenticated', 'authenticated'),
  -- invited users
  ('44444444-0000-0000-0000-000000000001', 'cook@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('44444444-0000-0000-0000-000000000002', 'Mixed.Case@Restaurante-X.test', now(), 'authenticated', 'authenticated'),
  ('44444444-0000-0000-0000-000000000003', 'unconfirmed@restaurante-x.test', null, 'authenticated', 'authenticated'),
  ('44444444-0000-0000-0000-000000000004', 'revoked@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('44444444-0000-0000-0000-000000000005', 'expired@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('44444444-0000-0000-0000-000000000006', 'nobody@restaurante-x.test', now(), 'authenticated', 'authenticated');

insert into public.companies (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Restaurante X'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Restaurante Y');

insert into public.memberships (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'manager'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'owner');

insert into public.invites (company_id, email, role, invited_by, expires_at, revoked_at) values
  -- cook: valid in A and in B
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cook@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now() + interval '7 days', null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'cook@restaurante-x.test', 'admin', '22222222-0000-0000-0000-000000000001', now() + interval '7 days', null),
  -- invite for someone else, never for nobody@
  ('aaaaaaaa-0000-0000-0000-000000000001', 'someone-else@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now() + interval '7 days', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'mixed.case@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now() + interval '7 days', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'unconfirmed@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now() + interval '7 days', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'revoked@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now() + interval '7 days', now()),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'expired@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now() - interval '1 second', null),
  -- the manager is invited again, as admin
  ('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test', 'admin', '11111111-0000-0000-0000-000000000001', now() + interval '7 days', null);

-- ---------------------------------------------------------------------------
-- A valid invite becomes a membership, once
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000001","role":"authenticated"}';
select is(public.accept_my_invites(), 2, 'cook accepts the two valid invites (A and B)');
select is(access.accept_invites(), 0, 'accepting again accepts nothing');
select results_eq(
  $$select c.name, m.role::text from public.memberships m join public.companies c on c.id = m.company_id
    where m.user_id = '44444444-0000-0000-0000-000000000001' order by c.name$$,
  $$values ('Restaurante X', 'chef'), ('Restaurante Y', 'admin')$$,
  'cook is chef in A and admin in B, with the invited roles'
);
reset role;

select is(
  (select count(*) from public.memberships where user_id = '44444444-0000-0000-0000-000000000001'),
  2::bigint,
  'accepting twice creates no duplicate membership'
);
select is(
  (select count(*) from public.invites where email = 'cook@restaurante-x.test' and accepted_at is not null),
  2::bigint,
  'both invites are marked accepted'
);

-- ---------------------------------------------------------------------------
-- Invites that must not be accepted
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000006","role":"authenticated"}';
select is(access.accept_invites(), 0, 'an invite for another e-mail is not accepted');
reset role;
select is(
  (select accepted_at from public.invites where email = 'someone-else@restaurante-x.test'),
  null,
  'the other e-mail invite stays pending'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000004","role":"authenticated"}';
select is(access.accept_invites(), 0, 'a revoked invite is not accepted');
reset role;
select is(
  (select count(*) from public.memberships where user_id = '44444444-0000-0000-0000-000000000004'),
  0::bigint,
  'no membership from a revoked invite'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000005","role":"authenticated"}';
select is(access.accept_invites(), 0, 'an expired invite is not accepted');
reset role;
select is(
  (select count(*) from public.memberships where user_id = '44444444-0000-0000-0000-000000000005'),
  0::bigint,
  'no membership from an expired invite'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000003","role":"authenticated"}';
select is(access.accept_invites(), 0, 'an unconfirmed e-mail accepts nothing');
reset role;
select is(
  (select accepted_at from public.invites where email = 'unconfirmed@restaurante-x.test'),
  null,
  'the invite of an unconfirmed e-mail stays pending'
);

-- A JWT claim with another e-mail does not matter: the e-mail comes from auth.users.
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000006","role":"authenticated","email":"someone-else@restaurante-x.test"}';
select is(access.accept_invites(), 0, 'the e-mail claim in the JWT is ignored');
reset role;

-- ---------------------------------------------------------------------------
-- Case-insensitive match
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000002","role":"authenticated"}';
select is(access.accept_invites(), 1, 'the e-mail matches case-insensitively');
reset role;

-- ---------------------------------------------------------------------------
-- An existing membership keeps its role
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000003","role":"authenticated"}';
select is(access.accept_invites(), 1, 'the manager invite as admin is consumed');
reset role;
select is(
  (select role::text from public.memberships
   where user_id = '11111111-0000-0000-0000-000000000003' and company_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
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
