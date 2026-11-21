# 0005. Security definer functions in the `access` schema

Date: 2026-11-21 · Status: accepted

## Context

RLS policies need to ask "is the current user a member of this company, and with which role?". The answer lives in `memberships`, which has RLS itself. A policy on `memberships` that queries `memberships` recurses. Invites have a second problem. A user who is not yet a member must turn their own invite into a membership, but they can neither read `invites` nor insert into `memberships`.

AGENTS.md allows `security definer` only in the `access` schema, with an ADR. This ADR lists every such function.

## Decision

The `access` schema holds four `security definer` functions and nothing else. All four follow the same rules:

- `set search_path = ''`, with every name schema-qualified.
- They read the user from `auth.uid()` and take no `user_id` parameter, so nobody can ask about another user.
- `execute` is revoked from `public`, `anon` and `service_role` and granted only to `authenticated`. `anon` has no `usage` on the schema.
- Owner: `postgres`, which owns the tables and therefore bypasses their RLS inside the function.

### `access.is_member(company_id uuid) returns boolean`

- **Touches:** reads `public.memberships`, filtered by `company_id` and `auth.uid()`. Writes nothing. `stable`.
- **Why definer:** policies on `companies` and `memberships` call it, and running it with the caller's rights would recurse into the `memberships` policy.
- **What a caller learns:** only whether they belong to a given company, which they could already find out by reading `companies`.

### `access.has_role(company_id uuid, variadic roles member_role[]) returns boolean`

- **Touches:** reads `public.memberships`, filtered by `company_id`, `auth.uid()` and the listed roles. Writes nothing. `stable`.
- **Why definer:** same as `is_member`. The `invites` policies call it.
- **Semantics:** the roles are explicit and there is no hierarchy. `has_role(c, 'admin')` is false for an owner, and callers write `has_role(c, 'owner', 'admin')`.

### `access.accept_invites() returns integer`

- **Touches:**
  - reads `auth.users` (only the caller's row: `email`, `email_confirmed_at`);
  - reads and locks the caller's pending `public.invites` rows (`for update`);
  - inserts into `public.memberships` (`on conflict (company_id, user_id) do nothing`);
  - sets `public.invites.accepted_at`.
- **Why definer:** a non-member cannot read `invites` or insert into `memberships`, and must not be able to. This function is the only path from an invite to a membership.
- **Guards:**
  - The e-mail comes from `auth.users`, not from the JWT, and `email_confirmed_at` must be set. A JWT `email` claim is ignored (pgTAP covers it).
  - Only invites that are not accepted, not revoked and not expired count.
  - An existing membership keeps its role. The invite is still marked accepted.
  - Idempotent: a second call finds nothing pending and returns 0.
- **Returns:** how many invites were accepted.

### `access.member_role_for_email(company_id uuid, email text) returns member_role`

- **Touches:** reads `public.memberships` joined to `auth.users` (`id`, `email`), filtered by `company_id` and by `lower(btrim(email))` on both sides. Writes nothing. `stable`.
- **Why definer:** an owner or admin must know whether an e-mail already belongs to the team before inviting it, but `memberships` holds only `user_id` and nobody but `postgres` can read `auth.users`.
- **What a caller learns:** the role answers only when the caller has `has_role(company_id, 'owner', 'admin')`. Then it says whether that e-mail is a member of the caller's own company, and with which role. For everyone else, and for any other company, it returns `null`. A non-member e-mail and an e-mail with no account both return `null`, so it never reveals whether an account exists.
- **Used by:** the `invites_one_pending` trigger, which refuses an invite for a member e-mail (`unique_violation`, constraint `invites_email_already_member`, current role in the detail), and the invite action, which asks first only to word the message in Portuguese.

### Not security definer

- `public.accept_my_invites()` and `public.member_role_for_email(company_id, email)` are `security invoker` SQL wrappers around the `access` functions of the same purpose. They exist because the Data API exposes only the `public` schema. `execute` is granted only to `authenticated`.
- The `invites` triggers `invites_one_pending` (refuses a member e-mail; one pending, unexpired invite per e-mail per company, with an advisory lock) and `invites_stamp_revoked_at` are `security invoker`. SQL run as `postgres` (seed, fixtures) skips the member check, because `member_role_for_email` answers only to an owner or admin.

## Consequences

- Policies stay short and do not recurse, and the membership check lives in one place.
- These four functions bypass RLS, so any change to them needs a review of this ADR and its pgTAP tests (`supabase/tests/r2_*.test.sql`).
- A new `security definer` function, or a new table touched by one of these, needs this ADR to be updated, or a new ADR.
- `service_role` has no grants on `companies`, `memberships` or `invites`. The importer (R11) or the private instance (R42) will need an explicit grant in a new migration.
- The foreign keys to `auth.users` block deleting an auth user. This is intended: there are no hard deletes.
