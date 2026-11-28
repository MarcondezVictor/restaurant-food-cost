# Database tests (pgTAP)

Run with `npx supabase test db`. Each file runs in a transaction and rolls back.

## Reserved ids and e-mails

- Every fixed id in these tests starts with `7e570000-` ("test"), for example `7e570000-0000-0000-00aa-000000000001`. The fourth group says what the id is for, so a test stays readable.
- Every e-mail in these tests starts with `pgtap-`, for example `pgtap-owner@restaurante-x.test`.

The seed (`supabase/seed/`, R41), the fixtures (`tests/fixtures/`) and the end-to-end runs never use ids that start with `7e570000-` or e-mails that start with `pgtap-`. Then the tests also pass on a local database that already holds end-to-end data, without `npx supabase db reset` first.

## What each file covers

- `r2_isolation.test.sql`: company isolation, anon, non-members, `has_role` without hierarchy.
- `r2_invites.test.sql`: who invites and revokes, nobody writes `memberships`, one pending invite per e-mail.
- `r2_accept_invites.test.sql`: `access.accept_invites()`.
- `r2_member_role_for_email.test.sql`: `access.member_role_for_email()` and the "already a member" rule.
