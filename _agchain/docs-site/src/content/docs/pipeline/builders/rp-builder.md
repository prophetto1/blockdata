---
title: RP Builder
description: Research Pack builder — assembles authority sets from datasets for each anchor opinion.
sidebar:
  order: 1
---

`scripts/rp_builder.py` builds Research Packs from seven data sources. Each RP contains the anchor opinion payload and a ranked set of authorities.

## Outputs

Per-RP directory under `datasets/rps/rpv1__<caseId>/`:

- `payloads/d1.json` — anchor text + citation roster
- `payloads/d2.json` — ranked authorities
- `manifest.json` — per-RP hashes for reproducibility

## Authority selection

- SCOTUS authorities: top K=10 by Fowler score
- CAP authorities: top K=5 by relevance ranking
- Deterministic tie-breaking: Fowler score → occurrence count → lexicographic
- All authorities include `inventory_normalized_cite` for later integrity checks
