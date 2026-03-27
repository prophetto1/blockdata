---
title: EU Builder
description: Evaluation Unit builder — converts Research Packs into runtime EU packages with ground truth.
sidebar:
  order: 2
---

`scripts/eu_builder.py` converts RP outputs into EU packages consumable by the runner.

## Outputs

Per-EU directory under `datasets/eus/<benchmark_id>/eus/<eu_id>/`:

- `p1.json` — anchor payload (candidate-visible)
- `p2.json` — authorities payload (candidate-visible when admitted)
- `ground_truth.json` — runner-only answers

## Ground truth derivation

- `anchor_inventory_full` — sorted unique normalized citations from anchor
- `rp_subset` — normalized citations from shipped authorities
- `known_authority` — controlling authority, in-favor, against, most-frequent (deterministic with tie-breakers)
