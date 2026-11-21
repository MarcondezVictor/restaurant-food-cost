-- R2: access.member_role_for_email() and the database rule that an existing member cannot be invited.
begin;

select plan(20);

insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('11111111-0000-0000-0000-000000000001', 'owner@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000002', 'admin@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000003', 'manager@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000004', 'chef@restaurante-x.test', now(), 'authenticated', 'authenticated'),
  ('11111111-0000-0000-0000-000000000005', 'Mixed.Case@Restaurante-X.test', now(), 'authenticated', 'authenticated'),
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
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 'chef'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'owner');

-- Runs an insert and returns "constraint:detail" of the unique_violation it raises.
create function pg_temp.unique_violation_of(statement text)
returns text
language plpgsql
as $$
declare
  violated text;
  detail text;
begin
  execute statement;
  return 'no error';
exception when unique_violation then
  get stacked diagnostics violated = constraint_name, detail = pg_exception_detail;
  return violated || ':' || detail;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who gets an answer
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test'),
  'manager'::public.member_role,
  'owner gets the role of a member e-mail'
);
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', '  MIXED.case@restaurante-x.TEST '),
  'chef'::public.member_role,
  'the e-mail is compared lower case and trimmed, on both sides'
);
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'outsider@restaurante-x.test'),
  null,
  'an account that is not a member gives null'
);
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'nobody@restaurante-x.test'),
  null,
  'an e-mail with no account gives null, the same answer as a non-member'
);
select is(
  access.member_role_for_email('bbbbbbbb-0000-0000-0000-000000000001', 'owner@restaurante-y.test'),
  null,
  'owner of A gets null for a company they do not belong to'
);
select is(
  public.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test'),
  'manager'::public.member_role,
  'the public wrapper gives the same answer'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}';
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test'),
  'manager'::public.member_role,
  'admin gets the role of a member e-mail'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000003","role":"authenticated"}';
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'chef@restaurante-x.test'),
  null,
  'manager gets null'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000004","role":"authenticated"}';
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test'),
  null,
  'chef gets null'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test'),
  null,
  'a non-member gets null'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test'),
  null,
  'owner of another company gets null'
);
reset role;

set local role anon;
set local request.jwt.claims = '';
select throws_ok(
  $$select access.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test')$$,
  '42501', null, 'anon cannot execute access.member_role_for_email'
);
select throws_ok(
  $$select public.member_role_for_email('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test')$$,
  '42501', null, 'anon cannot execute public.member_role_for_email'
);
reset role;

select ok(
  (select prosecdef from pg_proc where oid = 'access.member_role_for_email(uuid, text)'::regprocedure)
  and not (select prosecdef from pg_proc where oid = 'public.member_role_for_email(uuid, text)'::regprocedure),
  'access function is security definer, public wrapper is invoker'
);

-- ---------------------------------------------------------------------------
-- The database refuses an invite for an e-mail that is already a member
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  pg_temp.unique_violation_of(
    $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'manager@restaurante-x.test', 'admin')$$
  ),
  'invites_email_already_member:manager',
  'owner inserting an invite for a member e-mail is refused, with the current role in the detail'
);
select is(
  pg_temp.unique_violation_of(
    $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'mixed.case@restaurante-x.test', 'manager')$$
  ),
  'invites_email_already_member:chef',
  'a member whose account e-mail has capitals is caught too'
);
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'outsider@restaurante-x.test', 'chef')$$,
  'an account that is not a member can be invited'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}';
select is(
  pg_temp.unique_violation_of(
    $$insert into public.invites (company_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'owner@restaurante-x.test', 'chef')$$
  ),
  'invites_email_already_member:owner',
  'admin inserting an invite for the owner e-mail is refused'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$insert into public.invites (company_id, email, role) values ('bbbbbbbb-0000-0000-0000-000000000001', 'manager@restaurante-x.test', 'chef')$$,
  'a member of A can be invited into B'
);
reset role;

select is(
  (select count(*) from public.invites where email in ('manager@restaurante-x.test', 'mixed.case@restaurante-x.test', 'owner@restaurante-x.test')
     and company_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'no invite row was created for a member of A'
);

select * from finish();
rollback;
