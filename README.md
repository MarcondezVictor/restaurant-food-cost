# Food cost for independent restaurants

Track what every dish really costs, from the purchase invoice to the actual food cost between two stock counts, with less work than the POS.

> Status: **E0, setting up the base.** No features yet. Roadmap below.

## The problem

Restaurant POS systems already offer stock and food cost, but nobody feeds them: registering ingredients and invoices is slow and confusing. This app was built for a real independent restaurant (kept anonymous) with one rule: every task must take fewer taps than in the POS.

## Demo

Coming with E1. The demo runs with **Restaurante X**, a fictitious company with synthetic data.

## Run it locally

Requirements: Node 24 (`.nvmrc`), Docker running. The Supabase CLI comes with `npm ci` and runs through `npx`.

```bash
npm ci
npx supabase start
cp .env.example .env.local   # then paste API_URL and PUBLISHABLE_KEY from `npx supabase status`
npm run seed
npm run dev
```

Sign-in is a 6-digit code sent by e-mail. Locally, e-mails land in Mailpit at http://127.0.0.1:54324.

Demo logins (owner, admin) will be listed here once the seed exists.

## Technical decisions

Each one has a short ADR in [`docs/adr/`](docs/adr/).

- [Multi-company from day one, enforced by RLS](docs/adr/0001-multi-company-with-rls.md)
- [Base units and nested packages](docs/adr/0002-base-units-and-nested-packages.md)
- [Invoices by XML upload, no SEFAZ, no third parties](docs/adr/0003-invoices-by-xml-upload-not-sefaz.md)
- [No real data in the public repository](docs/adr/0004-no-real-data-in-the-repository.md)

## Tests

```bash
npm run verify          # lint, types, format, unit tests, build
npx supabase test db    # pgTAP: who can and who cannot
```

## How it is built

Work is split into issues, one PR per issue, following [`AGENTS.md`](AGENTS.md). AI agents (Claude) plan, implement, and review in separate sessions with fixed roles; every PR is reviewed and merged by a human.

## Roadmap

| Stage | Delivers                                                               |
| ----- | ---------------------------------------------------------------------- |
| E0    | Repository, auth, companies, roles, dark design system, synthetic seed |
| E1    | Ingredients, units, setup wizard                                       |
| E2    | Suppliers, catalog, invoice XML upload, manual entry                   |
| E3    | Recipes, sales import, theoretical food cost                           |
| E4    | Stock counts on the phone, actual food cost (**MVP**)                  |

## License

All rights reserved. The code is public for portfolio purposes.
