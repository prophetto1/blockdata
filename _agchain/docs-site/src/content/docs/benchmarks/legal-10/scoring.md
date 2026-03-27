---
title: Scoring
description: Deterministic scoring, judge-scored IRAC, citation integrity, and score aggregation.
sidebar:
  order: 2
---

Legal-10 uses a hybrid scoring approach combining deterministic checks with LLM-as-judge evaluation.

## d1 — Deterministic scoring

The d1 score is the mean of four 0.25-weight components:

| Component | Method |
|-----------|--------|
| `controlling_authority` | Exact match |
| `in_favor` | F1 (precision × recall) |
| `against` | F1 (precision × recall) |
| `most_frequent` | Exact match |

Ground truth is derived deterministically from the citation graph with documented tie-breakers (Fowler score → occurrence count → lexicographic).

## d2 + j3 — Judge IRAC grading

A single judge call grades both the closed-book and open-book IRACs using the MEE rubric:

- Issue, Rule, Application, Conclusion each scored 0–6
- Maximum 24 points per IRAC
- Runner computes totals and normalized scores from judge grades

## Citation integrity (post-chain)

- **Closed-book validity** — citations must appear in `anchor_inventory_full`
- **Open-book validity** — citations must appear in `anchor_inventory_full ∪ rp_subset`
- Computes RP-usage metrics (how much of the research pack the model actually cited)

## Aggregation

Step scores are aggregated by arithmetic mean. Chain completion status and integrity check results are recorded in `summary.json`.
