-- R2 end-to-end bootstrap. Synthetic data only.
--
-- Companies are not created from a screen in R2, so the first company and its
-- owner come from SQL. Sign in once in the app as dono@restaurante-x.test
-- (that creates the account through the e-mail code), then run, as postgres:
--
--   docker exec -i supabase_db_restaurant-food-cost psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/r2-owner.sql
--
-- Running it twice changes nothing.
do $$
declare
  owner_id uuid;
begin
  select id into owner_id
  from auth.users
  where email = 'dono@restaurante-x.test';

  if owner_id is null then
    raise exception 'Sign in once as dono@restaurante-x.test before running this fixture.';
  end if;

  insert into public.companies (id, name)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Restaurante X')
  on conflict (id) do nothing;

  insert into public.memberships (company_id, user_id, role)
  values ('aaaaaaaa-0000-0000-0000-000000000001', owner_id, 'owner')
  on conflict (company_id, user_id) do nothing;
end;
$$;
