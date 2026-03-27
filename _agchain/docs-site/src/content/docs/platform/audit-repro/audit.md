---
title: Audit & Integrity
description: Hash proofs, run artifacts, and reproducibility.
sidebar:
  order: 1
---

## Audit log

`audit_log.jsonl` records one entry per step boundary:

- SHA-256 hashes of all staged files
- Hash of the final assembled message
- Message byte count
- Payloads admitted at that step
- `ground_truth_accessed: false` confirmation for candidate steps

## Run artifacts

| Artifact | Purpose |
|----------|---------|
| `run.jsonl` | Append-only event log of model/judge/post-chain steps |
| `audit_log.jsonl` | Hash proofs and delivery verification |
| `candidate_state.json` | Sanitized carry-forward outputs |
| `summary.json` | Scores, aggregate rollups, chain completion status |
| `run_manifest.json` | Provenance: runner version, model configs, file hashes, reproducibility key |

## Reproducibility

Deterministic scoring is reproducible given identical inputs. The `reproducibility_key` in `run_manifest.json` is a combined hash over all input files and configurations.
