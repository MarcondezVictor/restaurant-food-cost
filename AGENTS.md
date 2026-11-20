# AGENTS.md

Rules for every person and every AI agent working in this repository. Read this file, the issue, and the module README before writing anything.

## 1. What this project is

Food cost control for an independent restaurant: purchase invoice → ingredient cost → recipe cost → stock count → actual food cost (CMV) between two counts.

- **Private instance:** used by one real restaurant. Its data never touches this repository.
- **Public repository:** portfolio. The only company here is the fictitious **Restaurante X**, with synthetic data.
- **Not a commercial SaaS.** No billing, marketing, WhatsApp, or usage analytics until a second real user exists.

## 2. Golden rules

1. **No real data in the repository.** Never commit spreadsheets, invoice XML, CSV exports, photos, or `.env` values. Synthetic files live only in `supabase/seed/` and `tests/fixtures/`. CI fails on any data file elsewhere.
2. **Never invent a number.** An unknown price, weight, or yield is stored with status `missing` or `simulated` and shown as such.
3. **Less work than the POS.** Every screen is judged by how many taps and seconds a task takes. If a change makes a task slower, it needs a reason in the PR.

## 3. Language

- Code, database, commits, PRs, issues, and docs: **English**.
- Everything the user sees: **Brazilian Portuguese**, kitchen language (see section 9).

## 4. Stack

- Next.js (App Router), TypeScript `strict`, Tailwind with theme tokens only.
- Supabase: Postgres, Auth, Row Level Security. Local development with the Supabase CLI.
- Unit tests: `node --test` on pure functions. Database tests: pgTAP.
- Node version pinned in `.nvmrc` and `engines`.

## 5. Structure

```
app/                    thin routes: guard + one query + one component
modules/<id>/
  README.md             approved module plan
  types.ts              types and labels
  rules.ts              pure functions, unit tested
  queries.ts            reads (server only)
  actions.ts            server actions (writes)
  components/
lib/                    auth, module guard, supabase clients, shared helpers
components/ui/          design system
supabase/migrations/    never edit a migration that is on main
supabase/tests/         pgTAP: who can and who cannot
supabase/seed/          Restaurante X, synthetic only
tests/                  unit tests and synthetic fixtures
docs/                   product.md, module-plan.md, adr/
```

- A module touches only its own tables. To use another module, call its exported functions.
- Changes to `lib/` or `components/ui/` go in their own PR, with their own reason.

## 6. Database and security

- Every business table has `company_id uuid not null` referencing `companies`, and RLS enabled.
- Policies use the helpers in the `access` schema (`access.is_member(company_id)`, `access.has_role(company_id, role)`). No `security definer` outside `access`; each one there needs an ADR.
- A new table ships in **one** migration with grants, RLS, policies, and pgTAP tests for who can **and** who cannot.
- Roles: `owner` and `admin` have screens now. `manager` and `chef` exist in the model and in the policies, with no screens yet.
- Naming: tables in `snake_case` plural (`items`, `item_packages`, `supplier_items`), foreign keys `<singular>_id`, dates `timestamptz`, money and quantities `numeric`.

## 7. Domain rules (from the unit specification)

- Quantities are stored in a base unit: `g`, `ml`, or `un`. Packages nest (box → tray → unit); their size in base units is computed, never typed.
- Prices are **net**: line value minus line discount. Stored with 6 decimals, shown with 2.
- Recipe cost uses the **last purchase** by date. Stock value uses the **weighted average** cost.
- Loss and yield are their own fields, never hidden inside a conversion factor.
- Data status: `real`, `informed`, `simulated`, `missing`. The weakest status of any input propagates to the result.
- Service charge is out of scope and never mixed into sales.
- Profit is never computed while a required fixed cost is missing.
- Invoice parsing discards personal data (CPF, names of people, payment and bank data) before anything is stored.

## 8. Server actions, always in this order

1. `"use server"` at the top of the file.
2. Validate input (types, lengths, enum values).
3. Check session and role on the server (`requireUser()`, then the module guard).
4. Write, and confirm the write (`.select("id")` returned a row).
5. Only then `revalidatePath()`.
6. Return a result the UI shows: success, or an error message in Portuguese.

## 9. Usability rules (apply from the first screen)

1. **One home screen per role.** The owner sees only what the owner needs; no generic menus.
2. **Kitchen language.** "Custo da comida", not "CMV", on everyday screens. Every number comes with a sentence that says what it means.
3. **Tap before typing.** Previous values prefilled, + and − for quantities, lists instead of free text.
4. **Nothing gets lost.** No hard deletes, undo on every action, drafts saved automatically.
5. **Errors say what to do**, in Portuguese, pointing to the place: "a soma deu R$ 12 a menos que o total; confira a 3ª linha". Never an error code.
6. **Cheap phone, bad internet.** Every screen opens in up to 2 s on an entry-level Android on 3G. Buttons ≥ 44 px, text ≥ 16 px. Dark theme by default.
7. **One task per screen.** No screen asks for two decisions at once.
8. **Less work than the POS** (golden rule 3), measured per task.

## 10. Git

- One branch per issue: `<module>/<issue>-<short-slug>`, from an updated `origin/main`.
- Conventional Commits: `feat(<module>): …`, `fix(<module>): …`, `docs(<module>): …`, `chore(<module>): …`.
- One PR per issue, body with `Closes #N`. Squash merge. Delete the branch after merge.
- Only the repository owner merges and pushes. AI agents propose the exact command and the diff, then wait.
- No AI attribution lines in commits or PRs. AI use is described in the PR section "Where I used AI".

## 11. Verify

- `npm run verify` = lint + typecheck + format check + unit tests + build.
- `npx supabase test db` = pgTAP.
- Both must pass locally and in CI before review. Paste the output, not a summary.

## 12. Definition of done

- Every box in the issue's "Done when" has code and a test that prove it.
- `verify` and `test db` are green.
- `npm run seed` still builds Restaurante X from scratch.
- No real data, keys, or personal data in the diff.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
