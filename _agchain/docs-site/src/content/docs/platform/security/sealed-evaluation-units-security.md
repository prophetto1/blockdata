---
title: "Sealed evaluation unit security"
sidebar:
  order: 1
---

﻿# tamper-detection to benchmark bundle format without changing the benchmark execution semantics.
- while this is a necessary feature, we need to update this document. 

## Problem
We need a way to detect any unauthorized modifications to a released benchmark bundle (shared steps/plan/judge prompts) and its included EUs (payloads + ground truth). The Runner/CE must refuse to run if anything has been changed.

## Goals
- Runner refuses to start if any benchmark or EU file differs from what was released.
- No separate signature files (signature must be embedded in a manifest JSON).
- Works with the current benchmark structure v2 model:
  - shared step prompts + plan live at benchmark root
  - each EU contains only payloads + ground truth
- Keep the evaluated-model leakage guarantee unchanged (staging directory pattern still required).

## Non-Goals
- Not defining new step prompts, scoring rubrics, or chain logic.
- Not changing what files the evaluated model sees (still: current step + admitted payloads only).

## Proposed Design

### 1) Add a single signed `manifest.json` at the benchmark root
Add:
- `legal10_v1/manifest.json`

This single file covers:
- benchmark-level files (e.g. `benchmark.json`, `private/plan.json`, `model/steps/*`, `private/judge_prompts/*`)
- EU-level files for each `eus/<eu_id>/...` (payloads + ground_truth)

Rationale: one manifest file is simplest to distribute and matches the constraint “no extra files”.

### 2) Embedded signature (no `.sig`)
`manifest.json` contains a `signature` object. The signature is computed over a deterministic canonical form of the manifest with the `signature` field omitted.

Recommended signature algorithm:
- `ed25519`

The Runner/CE ships with an allowlist of public keys (or a mapping `{key_id -> public_key}`) for verifying published releases.

### 3) Canonicalization rule (must be specified)
To avoid platform/JSON formatting differences, define `canonical-json-v1`:
- UTF-8
- stable key ordering (lexicographic)
- arrays preserve order
- no insignificant whitespace

The signature is computed over the canonical bytes.

### 4) Verification flow in Runner/CE
**Preflight (before any step):**
1. Load `manifest.json`.
2. Verify `signature` (fail-fast if invalid).
3. Verify benchmark-level files hashes/bytes.
4. Verify the selected EU’s files hashes/bytes (or verify all EUs if running a full sweep).

**Execution (per step):**
- Use staging directory pattern as specified in benchmark structure v2.

### 5) Manifest schema sketch (v2)
```json
{
  "protocol_version": "manifest-v2",
  "benchmark_id": "legal10_v1",
  "created_at": "2026-01-11T00:00:00Z",
  "generator_version": "...",

  "benchmark_files": [
    {"path": "benchmark.json", "sha256": "...", "bytes": 123},
    {"path": "private/plan.json", "sha256": "...", "bytes": 456}
  ],

  "eus": {
    "eu_case_001": {
      "files": [
        {"path": "eus/eu_case_001/model/payloads/p1.json", "sha256": "...", "bytes": 1},
        {"path": "eus/eu_case_001/model/payloads/p2.json", "sha256": "...", "bytes": 2},
        {"path": "eus/eu_case_001/private/ground_truth.json", "sha256": "...", "bytes": 3}
      ]
    }
  },

  "signature": {
    "alg": "ed25519",
    "key_id": "l10_root_2026_01",
    "signed_bytes": "canonical-json-v1",
    "value": "BASE64..."
  }
}
```

## Operational Impact
- **Publisher workflow:** build bundle → compute hashes → write `manifest.json` → sign → publish.
- **User workflow:** download CE + benchmark bundle → run. Verification is automatic; no extra steps.

## Risks / Tradeoffs
- A single manifest covering ~20,000 EUs may be large.
  - If this becomes a problem, the upgrade path is a Merkle-root manifest (still one file) that allows fast per-EU proofs.

## Open Decisions
- Root-only manifest size: acceptable vs require Merkle-root approach.
- Where to store verification public keys in CE (hardcoded key list vs config).
- Whether to verify all EU hashes on startup or only the selected `--eu-id`.

---

If approved, the next step is to update `internal/specs/benchmark-structure-v2.md` to include `manifest.json` in the benchmark tree and specify this verification flow.
