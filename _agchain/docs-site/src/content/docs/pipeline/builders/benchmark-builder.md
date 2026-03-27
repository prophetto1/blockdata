---
title: Benchmark Builder
description: Materializes the benchmark packet — plan, step definitions, judge prompts.
sidebar:
  order: 3
---

`runspecs/3-STEP-RUN/benchmark_builder.py` materializes the benchmark packet from FDQ specifications.

## Outputs

Under `runspecs/3-STEP-RUN/benchmark/`:

- `benchmark.json` — metadata, version, system message
- `plan.json` — step ordering, payload admission rules, scoring modes
- `model_steps/{d1,d2,j3}.json` — prompt templates, placeholders, output schemas
- `judge_prompts/irac_mee_pair_v1.json` — judge evaluation protocol

## Responsibilities

- Ensure step output schemas match FDQ-defined response contracts
- Produce deterministic output for identical inputs
- Include system message for the runner to use as the initial message
