# 0004. No real data in the public repository

Date: 2026-11-20 · Status: accepted

## Context
The repository is public (portfolio). The real restaurant's prices, suppliers, and margins are business secrets.

## Decision
The repository contains only the fictitious Restaurante X with synthetic data, generated without copying any real name, price, or number. The private instance runs the same code with its own environment and data, which never pass through Git. CI fails if a data file appears outside the synthetic folders.

## Consequences
Every feature must be demonstrable with synthetic data. Importers are tested with synthetic files in the same format as the real ones.
