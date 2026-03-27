---
title: Legal-10 Overview
description: What Legal-10 evaluates, what ships today, and where the specs and code live.
sidebar:
  order: 0
---

Legal-10 is the flagship benchmark hosted on AgChain. It evaluates whether a model can do **multi-step legal reasoning** over a single U.S. Supreme Court *anchor opinion*, while staying faithful to the evidence it is given.

Two principles drive most design decisions:

- **Sealed evidence:** all "open-book" material is built ahead of time into versioned artifacts (no runtime retrieval).
- **Plan-driven execution:** the runner executes exactly what `plan.json` declares (step order, payload admission, scoring mode).

## What ships today (3-step MVP)

The currently implemented vertical slice is `legal10_3step_v1` in `legal-10/runspecs/3-STEP-RUN/benchmark/plan.json`:

- `d1` (Known Authority / KA-SC): classify citations in the anchor opinion (deterministic scoring).
- `d2` (IRAC without RP): write a closed-book IRAC from the anchor only (judge-scored).
- `j3` (IRAC with RP): write an open-book IRAC with an injected Research Pack (judge-scored).

After the last step, the runner performs post-chain work (notably citation integrity) and writes a run summary.

## What is specified (10-step chain)

Legal-10 also has an implementation-ready 10-question chain spec (`legal-10/docs/10-step-chain/chain-overview-v1.1.md`). It expands the chain between KA-SC and IRAC synthesis with deterministic questions that test truthfulness, fact extraction, citation treatment, authority discovery, and transitive reasoning.

One thing to watch for: **step IDs are plan-specific**. The same FDQ can appear under different IDs depending on the plan. Example:

- Closed-book IRAC is `d2` in the MVP plan but `d9` in the 10-step spec.
- Open-book IRAC is `j3` in the MVP plan but `j10` in the 10-step spec.

## Where to read what

Use this map to avoid doc drift and duplicated explanations.

| If you're trying to... | Read this docs-site section | Canonical source of truth in the repo |
|---|---|---|
| Understand what each step asks/returns | [Evaluation Steps](evaluation-steps/) | `legal-10/docs/fdq/` |
| Understand scoring + integrity checks | [Scoring](scoring/) | `legal-10/docs/fdq/` + `legal-10/runspecs/3-STEP-RUN/scorers/` |
| Understand shipped artifacts (EU/RP, sealing) | [Packages](packages/) | `legal-10/docs/build-pipeline/` |
| Understand data sources + DuckDB schema | [Data Model](data-model/) | `legal-10/docs/build-pipeline/sc-dataset-db-schema.md` |
| Work on the build-time pipeline | [Pipeline](../../pipeline/) | `legal-10/docs/build-pipeline/` |
| Work on runner/platform behavior | [Platform](../../platform/) | `legal-10/docs/platform/` |
