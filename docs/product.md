# Product plan

## Goal

Give the owner of an independent restaurant a reliable food cost (CMV) with **less work than the POS** already offers, while keeping cost and margin data private.

## Users now

| Role      | Has screens now | What they do                                                                                     |
| --------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `owner`   | Yes             | Sees costs, recipes, stock value, theoretical vs actual food cost                                |
| `admin`   | Yes             | Sets up the company, imports data, launches invoices and counts while there is no manager screen |
| `manager` | Not yet         | Exists in the model and in the policies                                                          |
| `chef`    | Not yet         | Exists in the model and in the policies                                                          |

## Shared pieces (E0)

Companies and RLS, auth and roles, module guard, data status, change log, dark design system, synthetic seed (Restaurante X), verify + CI.

## Modules

| Stage | Id          | Name                                                        | Depends on                      |
| ----- | ----------- | ----------------------------------------------------------- | ------------------------------- |
| E0    | `core`      | Companies, auth, roles, guard, design system, seed          | —                               |
| E1    | `items`     | Ingredients, packages, units, setup wizard                  | `core`                          |
| E1    | `import`    | Import from the private spreadsheet (private instance only) | `items`                         |
| E2    | `suppliers` | Suppliers and per-supplier catalog                          | `items`                         |
| E2    | `purchases` | Invoice review, XML upload, manual entry, checks            | `suppliers`                     |
| E3    | `recipes`   | House preparations and recipe cards                         | `items`, `purchases`            |
| E3    | `sales`     | Sales import from the POS export                            | `core`                          |
| E3–E4 | `cmv`       | Theoretical and actual food cost                            | `recipes`, `sales`, `inventory` |
| E4    | `inventory` | Stock counts on the phone, stock value                      | `items`                         |

**MVP gate (end of E4):** close one real month of actual food cost without opening the spreadsheet.

## Out of scope

- Querying SEFAZ, digital certificates, third-party invoice services.
- Photo/OCR invoice reading (future idea).
- Profit, P&L, break-even (needs fixed costs the restaurant does not have yet).
- Service charge.
- Anything commercial (billing, WhatsApp, usage analytics) until a second real user exists.
