# Core: companies, members, invites, sign-in

Owner: repository owner. Routes: `/`, `/entrar`, `/empresa/[companyId]`, `/empresa/[companyId]/convites`. Registry id: `core`.

## 0. Today

Before R2 the app had no sign-in and no notion of company.

## 1. Goal

The owner and the admin can bring people into their restaurant by e-mail, and nobody sees another restaurant's data.

## 2. Who uses it and what they do

| Role      | Actions                                                  |
| --------- | -------------------------------------------------------- |
| `owner`   | Signs in, invites any role (owner included), revokes     |
| `admin`   | Signs in, invites admin, manager and chef, revokes those |
| `manager` | Signs in, sees company and role (no other screen yet)    |
| `chef`    | Signs in, sees company and role (no other screen yet)    |
| no member | Signs in, sees "Você ainda não tem acesso", nothing else |

## 3. Main path

1. The owner opens the invite screen, types the e-mail, taps a role, taps "Criar convite".
2. The owner sends the sign-in link by WhatsApp (the app sends no invite e-mail in R2).
3. The person opens `/entrar`, types the e-mail, gets a 6-digit code by e-mail, types it.
4. On sign-in, `accept_my_invites()` turns the invite into a membership, and the home shows "Restaurante X · você é gerente".

## 4. Data

- `companies` (`id`, `name`, `created_at`). Created by SQL or the seed, not by a screen.
- `memberships` (`company_id`, `user_id`, `role`), one role per person per company.
- `invites` (`company_id`, `email`, `role`, `invited_by`, `created_at`, `expires_at`, `accepted_at`, `revoked_at`).
- Enum `member_role`: `owner`, `admin`, `manager`, `chef`.
- Who sees what: a member reads their companies and the members of those companies. Only owner and admin read and write invites; only an owner touches an owner invite. Nobody writes memberships directly. Details: ADR 0005 and `supabase/tests/r2_*.test.sql`.

## 5. In and out of this stage

In: e-mail code sign-in, invites, revoke, company home, company list.
Out: creating companies on screen (R41 seed, R42 private instance), sending invite e-mails (R42 SMTP), removing a member, changing a role, the module guard (R3).

## 6. Stories

- [x] Task: migration, RLS, pgTAP (R2).
- [x] As owner, I want to invite by e-mail, so that my team can sign in.
      Done when: the invite flow works end to end with two accounts.
