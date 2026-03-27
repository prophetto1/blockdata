---
title: Packages
description: Evaluation Units, Research Packs, benchmark packets, and bundle sealing.
sidebar:
  order: 3
---

Legal-10 packages evidence into sealed, versioned artifacts at build time.

## Evaluation Unit (EU)

One EU = one anchor opinion packaged for evaluation. Contains:

- **`p1.json`** (anchor payload) — case text, citation roster, metadata. Candidate-visible.
- **`p2.json`** (authorities payload) — research pack authorities with ranking data. Candidate-visible only when admitted by `plan.json`.
- **`ground_truth.json`** — known authority answers, anchor inventory, RP subset. Runner-only; never exposed to evaluated model.

## Research Pack (RP)

Build-time intermediate. Assembled from datasets by `rp_builder.py` and shipped inside the EU as `p2.json`. The RP directory itself is not included in the released bundle.

## Benchmark packet

Defines the chain under `benchmark/`:

- `benchmark.json` — metadata + system message
- `plan.json` — step ordering, payload admission, scoring modes
- `model_steps/{d1,d2,j3}.json` — prompt templates, placeholders, output schemas
- `judge_prompts/irac_mee_pair_v1.json` — judge protocol

## Bundle sealing

Released bundles are cryptographically sealed:

- **`manifest.json`** — SHA-256 hashes and byte counts for all files
- **`signature.json`** — Ed25519 detached signature over `manifest.json`
- Runner must refuse to execute if verification fails
