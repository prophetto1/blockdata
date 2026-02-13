---
title: Docs Policy
description: How we decide what belongs in docs-site vs. working docs.
sidebar:
  hidden: true
---

This docs site is intended to become the **canonical** documentation we trust and follow.

## What belongs here

Copy into `docs-site` when it is *pretty much locked* for the foreseeable future:
- Definitions (canonical terms and meanings)
- Contracts (data shapes, invariants, pairing rules)
- Specifications that other work depends on

**Default approach:** copy the original source content first, then make only **surgical edits** to reduce drift risk.

## What stays outside

By default, keep outside `docs-site` when it is still actively changing:
- Action plans
- Implementation plans
- Session logs / handoffs
- Task trackers and checklists

If we choose to include working material in `docs-site` (e.g., a Roadmap section), treat it as **living** and clearly label it as such, with links back to the canonical working-doc source in `docs/`.
