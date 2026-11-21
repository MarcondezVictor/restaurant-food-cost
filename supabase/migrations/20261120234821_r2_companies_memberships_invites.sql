-- R2: companies, memberships, invites, and the access schema (ADR 0001, ADR 0005).
--
-- Supabase grants ALL on new public tables and EXECUTE on new functions to
-- anon and authenticated by default. Every object below revokes that first and
-- grants back only what R2 needs.

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'admin', 'manager', 'chef');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

comment on table public.companies is
  'A restaurant. Created by the seed or by SQL, never from a screen in R2.';

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  user_id uuid not null references auth.users (id),
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

comment on table public.memberships is
  'Who belongs to which company, with one role per company. Rows come only from access.accept_invites() or from SQL.';

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  email text not null
    check (email = lower(btrim(email)))
    check (char_length(email) <= 254)
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  role public.member_role not null,
  invited_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  check (accepted_at is null or revoked_at is null)
);

create index invites_company_id_email_idx on public.invites (company_id, email);
create index invites_email_idx on public.invites (email);

comment on table public.invites is
  'Pending access by e-mail. Accepted by access.accept_invites(); revoked by setting revoked_at. Never deleted.';

-- ---------------------------------------------------------------------------
-- Invite triggers (security invoker)
-- ---------------------------------------------------------------------------

-- One pending, unexpired invite per (company_id, email). A partial unique
-- index cannot use now(), so this runs as a BEFORE INSERT trigger with an
-- advisory lock that serializes concurrent inserts for the same pair.
-- It also rejects an invite for an e-mail that is already a member of the
-- company, with the current role in the error detail.
-- Security invoker: it reads invites through the caller's RLS. Only owner and
-- admin can insert, and both can read every invite of their company. The
-- member check uses access.member_role_for_email(), which answers only for an
-- owner or admin caller (SQL run as postgres is not checked).
create function public.invites_one_pending()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_role_of_email public.member_role;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.company_id::text || ':' || new.email, 0)
  );

  current_role_of_email := access.member_role_for_email(new.company_id, new.email);
  if current_role_of_email is not null then
    raise exception using
      errcode = 'unique_violation',
      message = 'this e-mail is already a member of this company',
      detail = current_role_of_email::text,
      constraint = 'invites_email_already_member';
  end if;

  if exists (
    select 1
    from public.invites i
    where i.company_id = new.company_id
      and i.email = new.email
      and i.accepted_at is null
      and i.revoked_at is null
      and i.expires_at > pg_catalog.now()
  ) then
    raise exception using
      errcode = 'unique_violation',
      message = 'a pending invite already exists for this e-mail in this company',
      constraint = 'invites_one_pending';
  end if;

  return new;
end;
$$;

create trigger invites_one_pending
before insert on public.invites
for each row execute function public.invites_one_pending();

-- Revoking stamps the real time, whatever value the client sent.
create function public.invites_stamp_revoked_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    new.revoked_at := pg_catalog.now();
  end if;
  return new;
end;
$$;

create trigger invites_stamp_revoked_at
before update of revoked_at on public.invites
for each row execute function public.invites_stamp_revoked_at();

revoke all on function public.invites_one_pending() from public, anon, authenticated, service_role;
revoke all on function public.invites_stamp_revoked_at() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Schema access (security definer helpers, ADR 0005)
-- ---------------------------------------------------------------------------

create schema access;

revoke all on schema access from public;
grant usage on schema access to authenticated;

-- True when the current user belongs to the company.
create function access.is_member(company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = is_member.company_id
      and m.user_id = (select auth.uid())
  );
$$;

-- True when the current user has one of the listed roles in the company.
-- No hierarchy: has_role(c, 'admin') is false for an owner.
create function access.has_role(company_id uuid, variadic roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = has_role.company_id
      and m.user_id = (select auth.uid())
      and m.role = any (has_role.roles)
  );
$$;

-- The current role in the company of the account with this e-mail, or null.
-- Answers only when the caller is owner or admin of that company; for anyone
-- else it returns null, so it reveals nothing about other companies or about
-- whether an account exists.
create function access.member_role_for_email(company_id uuid, email text)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.company_id = member_role_for_email.company_id
    and lower(btrim(u.email)) = lower(btrim(member_role_for_email.email))
    and access.has_role(member_role_for_email.company_id, 'owner', 'admin');
$$;

-- Turns the current user's pending invites into memberships.
-- The e-mail comes from auth.users and must be confirmed. Revoked and expired
-- invites are skipped. An existing membership keeps its role. Running it twice
-- does nothing the second time. Returns how many invites were accepted.
create function access.accept_invites()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  confirmed_email text;
  invite record;
  accepted integer := 0;
begin
  if current_user_id is null then
    return 0;
  end if;

  select lower(btrim(u.email))
  into confirmed_email
  from auth.users u
  where u.id = current_user_id
    and u.email_confirmed_at is not null;

  if confirmed_email is null then
    return 0;
  end if;

  for invite in
    select i.id, i.company_id, i.role
    from public.invites i
    where i.email = confirmed_email
      and i.accepted_at is null
      and i.revoked_at is null
      and i.expires_at > pg_catalog.now()
    order by i.created_at
    for update
  loop
    insert into public.memberships (company_id, user_id, role)
    values (invite.company_id, current_user_id, invite.role)
    on conflict (company_id, user_id) do nothing;

    update public.invites
    set accepted_at = pg_catalog.now()
    where id = invite.id;

    accepted := accepted + 1;
  end loop;

  return accepted;
end;
$$;

revoke all on function access.is_member(uuid) from public, anon, service_role;
revoke all on function access.has_role(uuid, public.member_role[]) from public, anon, service_role;
revoke all on function access.accept_invites() from public, anon, service_role;
revoke all on function access.member_role_for_email(uuid, text) from public, anon, service_role;
grant execute on function access.member_role_for_email(uuid, text) to authenticated;
grant execute on function access.is_member(uuid) to authenticated;
grant execute on function access.has_role(uuid, public.member_role[]) to authenticated;
grant execute on function access.accept_invites() to authenticated;

-- The Data API only exposes the public schema. This invoker wrapper lets the
-- app call accept_invites() through supabase.rpc('accept_my_invites').
create function public.accept_my_invites()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select access.accept_invites();
$$;

revoke all on function public.accept_my_invites() from public, anon, service_role;
grant execute on function public.accept_my_invites() to authenticated;

-- Same reason: lets the invite action ask for the current role of an e-mail
-- before inserting, to word the message. The trigger enforces the rule anyway.
create function public.member_role_for_email(company_id uuid, email text)
returns public.member_role
language sql
stable
security invoker
set search_path = ''
as $$
  select access.member_role_for_email(member_role_for_email.company_id, member_role_for_email.email);
$$;

revoke all on function public.member_role_for_email(uuid, text) from public, anon, service_role;
grant execute on function public.member_role_for_email(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (no delete anywhere)
-- ---------------------------------------------------------------------------

revoke all on table public.companies from public, anon, authenticated, service_role;
revoke all on table public.memberships from public, anon, authenticated, service_role;
revoke all on table public.invites from public, anon, authenticated, service_role;

grant select on table public.companies to authenticated;
grant select on table public.memberships to authenticated;
grant select on table public.invites to authenticated;
grant insert (company_id, email, role) on table public.invites to authenticated;
grant update (revoked_at) on table public.invites to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;

create policy companies_select_member
on public.companies
for select
to authenticated
using (access.is_member(id));

create policy memberships_select_member
on public.memberships
for select
to authenticated
using (access.is_member(company_id));

-- memberships has no insert, update or delete policy: rows come only from
-- access.accept_invites() (security definer) or from SQL.

create policy invites_select_owner_admin
on public.invites
for select
to authenticated
using (access.has_role(company_id, 'owner', 'admin'));

create policy invites_insert_owner_admin
on public.invites
for insert
to authenticated
with check (
  invited_by = (select auth.uid())
  and accepted_at is null
  and revoked_at is null
  and access.has_role(company_id, 'owner', 'admin')
  and (role <> 'owner' or access.has_role(company_id, 'owner'))
);

-- Revoking: only a pending invite (not accepted, not revoked), only by owner
-- or admin, and only an owner touches an owner invite. The new row must stay
-- revoked, so revoking cannot be undone.
create policy invites_revoke_owner_admin
on public.invites
for update
to authenticated
using (
  accepted_at is null
  and revoked_at is null
  and access.has_role(company_id, 'owner', 'admin')
  and (role <> 'owner' or access.has_role(company_id, 'owner'))
)
with check (
  accepted_at is null
  and revoked_at is not null
);
