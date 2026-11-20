# 0001. Multi-company from day one, enforced by RLS

Date: 2026-11-20 · Status: accepted

## Context
The app serves one real restaurant in a private instance, and a fictitious one (Restaurante X) in the public demo. The same code must never let one company read another's costs.

## Decision
Every business table carries `company_id`. Row Level Security is enabled on every table, with policies built on helpers in the `access` schema. Each new table ships with pgTAP tests for who can and who cannot.

## Consequences
Isolation is guaranteed by the database, not by application code. Every migration costs a little more (policies and tests). Adding a second company later needs no schema change.
