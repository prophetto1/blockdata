---
title: State Management
description: Candidate state carry-forward, sanitization, and session strategies.
sidebar:
  order: 1
---

## Candidate state

`candidate_state.json` carries model-derived artifacts between steps. It is keyed by step ID and accumulates — each step adds, never removes prior outputs.

## Sanitization

The following are forbidden in candidate state:

- Ground truth data
- Scores or scoring details
- Judge outputs
- Runner internal bookkeeping

Keys containing `ground_truth`, `score`, `judge`, `gt_`, or `rubric` are stripped.

## Session strategies

- **Replay_Minimal** (baseline) — each step is a fresh model call; no chat history accumulates. State carried only through `candidate_state.json` and admitted payloads.
- **Replay_Full** — growing message history across steps. Both strategies must yield identical audit proofs.
