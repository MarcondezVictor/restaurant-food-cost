-- R2: who can invite and revoke, nobody writes memberships, one pending invite per e-mail.
begin;

select plan(34);

insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('11111111-0000-0000-0000-000000000001', 'owner@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000002', 'admin@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000003', 'manager@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000004', 'chef@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('22222222-0000-0000-0000-000000000001', 'owner@restaurante-y.test', now(), 'authenticated', 'authenticated'),
  ('33333333-0000-0000-0000-000000000001', 'outsider@restaurante-x.test', now(), 'authenticated', 'authenticated');

insert into public.companies (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Restaurante X'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Restaurante Y');

insert into public.memberships (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'admin'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'manager'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'chef'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'owner');

-- Fixed invites (as postgres) for the revoke tests.
insert into public.invites (id, company_id, email, role, invited_by, accepted_at, revoked_at) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'future-owner@restaurante-x.test', 'owner', '11111111-0000-0000-0000-000000000001', null, null),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'future-chef@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', null, null),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'accepted@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', now(), null),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'revoked@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001', null, now() - interval '1 day');

-- ---------------------------------------------------------------------------
-- Who can create invites
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'm1@restaurante-x.test', 'chef')$$,
  '42501', null, 'manager cannot invite'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'c1@restaurante-x.test', 'chef')$$,
  '42501', null, 'chef cannot invite'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'o1@restaurante-x.test', 'chef')$$,
  '42501', null, 'non-member cannot invite'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'b1@restaurante-x.test', 'chef')$$,
  '42501', null, 'owner of B cannot invite into A'
);
reset role;

-- Admin of A
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a-owner@restaurante-x.test', 'owner')$$,
  '42501', null, 'admin cannot invite an owner'
);
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a-manager@restaurante-x.test', 'manager')$$,
  'admin invites a manager'
);
select is(
  (select invited_by from public.invites where email = 'a-manager@restaurante-x.test'),
  '11111111-0000-0000-0000-000000000002'::uuid,
  'invited_by is filled with the current user'
);
select throws_ok(
  $$insert into public.invites (company_id, email, role, invited_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'spoof@restaurante-x.test', 'chef', '11111111-0000-0000-0000-000000000001')$$,
  '42501', null, 'invited_by cannot be set by the client'
);
select throws_ok(
  $$insert into public.invites (company_id, email, role, expires_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'forever@restaurante-x.test', 'chef', now() + interval '10 years')$$,
  '42501', null, 'expires_at cannot be set by the client'
);
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', ' Mixed@Restaurante-X.test', 'chef')$$,
  '23514', null, 'an e-mail that is not lower case and trimmed is rejected'
);
reset role;

-- Owner of A
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'second-owner@restaurante-x.test', 'owner')$$,
  'owner invites an owner'
);
reset role;

-- ---------------------------------------------------------------------------
-- Revoking
-- ---------------------------------------------------------------------------

-- Admin cannot revoke an owner invite: the row is invisible to the update.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}';
update public.invites set revoked_at = now() where id = 'cccccccc-0000-0000-0000-000000000001';
reset role;
select is(
  (select revoked_at from public.invites where id = 'cccccccc-0000-0000-0000-000000000001'),
  null,
  'admin cannot revoke an owner invite'
);

-- Manager cannot revoke anything.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000003","role":"authenticated"}';
update public.invites set revoked_at = now() where id = 'cccccccc-0000-0000-0000-000000000002';
reset role;
select is(
  (select revoked_at from public.invites where id = 'cccccccc-0000-0000-0000-000000000002'),
  null,
  'manager cannot revoke an invite'
);

-- Admin revokes a chef invite; the time is stamped by the database.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}';
update public.invites set revoked_at = '2000-01-01' where id = 'cccccccc-0000-0000-0000-000000000002';
reset role;
select is(
  (select revoked_at from public.invites where id = 'cccccccc-0000-0000-0000-000000000002'),
  now(),
  'admin revokes a chef invite, stamped with the real time'
);

-- Owner revokes an owner invite.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
update public.invites set revoked_at = now() where id = 'cccccccc-0000-0000-0000-000000000001';

-- Revoking cannot be undone, and an accepted invite cannot be revoked.
update public.invites set revoked_at = null where id = 'cccccccc-0000-0000-0000-000000000004';
update public.invites set revoked_at = now() where id = 'cccccccc-0000-0000-0000-000000000003';

-- No other column can be updated.
select throws_ok(
  $$update public.invites set role = 'owner' where id = 'cccccccc-0000-0000-0000-000000000004'$$,
  '42501', null, 'role cannot be updated'
);
select throws_ok(
  $$update public.invites set expires_at = now() + interval '1 year' where id = 'cccccccc-0000-0000-0000-000000000004'$$,
  '42501', null, 'expires_at cannot be updated'
);
select throws_ok(
  $$update public.invites set accepted_at = now() where id = 'cccccccc-0000-0000-0000-000000000004'$$,
  '42501', null, 'accepted_at cannot be updated by the client'
);
select throws_ok(
  $$delete from public.invites where id = 'cccccccc-0000-0000-0000-000000000004'$$,
  '42501', null, 'invites cannot be deleted'
);
reset role;

select isnt(
  (select revoked_at from public.invites where id = 'cccccccc-0000-0000-0000-000000000001'),
  null,
  'owner revokes an owner invite'
);
select isnt(
  (select revoked_at from public.invites where id = 'cccccccc-0000-0000-0000-000000000004'),
  null,
  'a revoked invite cannot be un-revoked'
);
select is(
  (select revoked_at from public.invites where id = 'cccccccc-0000-0000-0000-000000000003'),
  null,
  'an accepted invite cannot be revoked'
);

-- ---------------------------------------------------------------------------
-- Nobody writes memberships directly (every role, owner included)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.memberships (company_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'chef')$$,
  '42501', null, 'owner cannot insert a membership'
);
select throws_ok(
  $$update public.memberships set role = 'admin' where user_id = '11111111-0000-0000-0000-000000000004'$$,
  '42501', null, 'owner cannot update a membership'
);
select throws_ok(
  $$delete from public.memberships where user_id = '11111111-0000-0000-0000-000000000004'$$,
  '42501', null, 'owner cannot delete a membership'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok(
  $$insert into public.memberships (company_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'chef')$$,
  '42501', null, 'admin cannot insert a membership'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok(
  $$insert into public.memberships (company_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'chef')$$,
  '42501', null, 'manager cannot insert a membership'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok(
  $$insert into public.memberships (company_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'chef')$$,
  '42501', null, 'chef cannot insert a membership'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.memberships (company_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'owner')$$,
  '42501', null, 'a non-member cannot insert their own membership'
);
select throws_ok(
  $$insert into public.companies (name) values ('Empresa nova')$$,
  '42501', null, 'companies cannot be created by a client'
);
reset role;

-- ---------------------------------------------------------------------------
-- One pending, unexpired invite per e-mail per company (BEFORE INSERT trigger)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a-manager@restaurante-x.test', 'chef')$$,
  '23505', null, 'a second pending, unexpired invite for the same e-mail is rejected'
);
reset role;

-- Expire the pending invite (as postgres) and invite again.
update public.invites set expires_at = now() - interval '1 second' where email = 'a-manager@restaurante-x.test';

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a-manager@restaurante-x.test', 'manager')$$,
  're-inviting an e-mail whose invite expired works'
);
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'revoked@restaurante-x.test', 'chef')$$,
  're-inviting an e-mail whose invite was revoked works'
);
reset role;

select is(
  (select revoked_at from public.invites where email = 'a-manager@restaurante-x.test' and expires_at < now()),
  null,
  'the expired invite stays as it was (not revoked)'
);

-- The same e-mail can be pending in another company.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('bbbbbbbb-0000-0000-0000-000000000001', 'a-manager@restaurante-x.test', 'chef')$$,
  'the same e-mail can have a pending invite in another company'
);
reset role;

select * from finish();
rollback;
