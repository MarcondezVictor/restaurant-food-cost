# 0002. Base units and nested packages

Date: 2026-11-20 · Status: accepted

## Context
Ingredients are bought in one unit (a box, a sack, kg), counted in another (a tray), and used in a third (grams, one piece). POS systems ask for "purchase unit" and "consumption unit" per item, and users get lost.

## Decision
Every quantity is stored in a base unit: `g`, `ml`, or `un`. Packages nest (box contains trays, tray contains units) and their size in base units is computed. Loss and yield are separate fields. Users answer three plain questions: how it arrives, how it is counted, how it goes into a recipe.

## Consequences
Every conversion is one pure function with unit tests. The setup wizard is longer than a single form, but each step is one simple question.
