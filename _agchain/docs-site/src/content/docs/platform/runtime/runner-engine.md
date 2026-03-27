---
title: Runner Engine
description: Plan-driven chain execution, step orchestration, and model adapter architecture.
sidebar:
  order: 1
---

The runner executes benchmark chains by reading `plan.json` and stepping through each evaluation in array order. Each step is a blocking operation — step N must complete before step N+1 begins.

## Execution contract

- Accepts a benchmark directory, EU directory (or root), and model adapter configs
- Generates a unique `run_id` per execution
- Produces `run.jsonl`, `audit_log.jsonl`, `candidate_state.json`, `summary.json`, and `run_manifest.json`

## Model adapters

The platform supports pluggable model adapters (OpenAI, Anthropic) with configurable provider/model pairs for both the evaluated model and the judge model.
