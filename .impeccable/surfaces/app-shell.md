---
version: 1
slug: "app-shell"
primary_target: "app-shell"
related_targets: ["route:/dashboard","route:/interviews","route:/interviews/[id]","route:/interviews/[id]/prepare","route:/practice","route:/analytics","route:/questions","route:/flashcards","route:/profile","route:/settings"]
---

# Surface thesis

Authenticated screens behave like a focused operating console: one dominant task canvas, one context rail, and a persistent next-best action. Navigation and metrics remain quiet until relevant.

## Shared grammar

- Floating desktop navigation and refined mobile bottom navigation.
- Asymmetric work surfaces instead of equal card grids.
- Inline instruments for scores, progress, timers, and trends.
- Drawers expose interview detail without losing calendar/workspace context.
- Empty, loading, degraded, and recovery states retain the same hierarchy.

## Responsive rule

Desktop uses task canvas plus rail. Tablet converts the rail to a horizontal strip. Mobile keeps only the next interview, readiness, and today’s focus above the fold; secondary detail moves into drawers and tabs.
