---
title: Evaluation Steps (FDQs)
description: What each step asks, what it must return, and how it is scored.
sidebar:
  order: 1
---

Each Legal-10 step is specified by a **Formal Delivery Query (FDQ)**: a self-contained spec that includes the prompt intent, the output contract, the ground truth derivation, and the scoring rule.

Two IDs matter:

- **FDQ ID (spec):** the numbered FDQ document in `legal-10/docs/fdq/` (example: `01-ka-sc.md`).
- **Step ID (execution):** the `step_id` in a benchmark packet's `plan.json` (example: `d1`, `d2`, `j3`).

Step IDs are plan-specific. The same FDQ can be reused under different step IDs depending on the chain (for example, the closed-book IRAC is `d2` in the MVP plan but `d9` in the 10-step spec).

## What runs today (3-step MVP)

The shipped MVP plan is `legal10_3step_v1` (`legal-10/runspecs/3-STEP-RUN/benchmark/plan.json`):

| Step ID | What the model does | Payloads injected | Scoring | Canonical FDQ spec | Primary implementation |
|---|---|---|---|---|---|
| `d1` | Known Authority (KA-SC): classify citations in the anchor opinion | `p1` | Deterministic | `legal-10/docs/fdq/01-ka-sc.md` | `legal-10/runspecs/3-STEP-RUN/scorers/d1_known_authority_scorer.py` |
| `d2` | IRAC without RP: closed-book IRAC from anchor only | `p1` | Judge | `legal-10/docs/fdq/09-irac-without-rp.md` | `legal-10/runspecs/3-STEP-RUN/run_3s.py` |
| `j3` | IRAC with RP: open-book IRAC with Research Pack injected | `p1`, `p2` | Judge | `legal-10/docs/fdq/10-irac-with-rp.md` | `legal-10/runspecs/3-STEP-RUN/run_3s.py` |

Notes:

- `p1`/`p2` are EU payload files (see [Packages](packages/)).
- In the MVP, the judge model is invoked once during `j3` and grades both IRAC outputs as a pair.

## Post-chain actions (MVP)

After the last model step, the runner performs two post-chain operations:

- **IRAC pair judge protocol** (spec): `legal-10/docs/fdq/post/irac-pair-scoring.md`  
  Prompt file: `legal-10/runspecs/3-STEP-RUN/benchmark/judge_prompts/irac_mee_pair_v1.json`
- **Citation integrity** (spec): `legal-10/docs/fdq/post/citation_integrity.py.md`  
  Implementation: `legal-10/runspecs/3-STEP-RUN/scorers/citation_integrity.py`

## What's defined for the full chain (10-step spec)

The 10-step chain spec (`legal-10/docs/10-step-chain/chain-overview-v1.1.md`) extends the MVP by adding deterministic FDQs between KA-SC and the IRAC steps:

- FDQs `02` through `08` (truthfulness checks, fact extraction, treatment classification, authority discovery, transitive reasoning)
- The same IRAC FDQs reused at later positions/IDs (`d9` for closed-book IRAC and `j10` for open-book IRAC in the spec)

## How to change a step without causing drift

Legal-10 intentionally separates **spec** from **execution artifacts**:

- Treat `legal-10/docs/fdq/` as the step-level source of truth.
- Treat the benchmark packet (`legal-10/runspecs/3-STEP-RUN/benchmark/*`) as what the runner actually executes.

When step behavior changes, update the FDQ spec first, then ensure the benchmark packet and runner/scorers reflect that change.

