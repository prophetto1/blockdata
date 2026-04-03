---
title: "Legal-10 chain overview"
sidebar:
  order: 2
---

# Legal-10 Overview 

**Version:** 1.1  
**Date:** 2026-01-25  
**Status:** All FDQs Implementation-Ready

---

## Chain Overview

```
[p1 injection]
     ↓
(1) KA-SC          — "What's in this opinion?"
     ↓
(2) C-NONEXIST1    — "Will you lie about fake cases?"
(3) CANARY         — "Will you use pretraining on real cases we didn't give you?"
     ↓
(4) FACT-EXTRACT   — Simple reading (closed enums)
(5) DISTINGUISH    — Single-edge treatment
(6) VALIDATE-AUTH  — Cross-reference integration
     ↓
(7) UNKNOWN-AUTH   — Reverse lookup (which cases cite X?)
(8) TRANSITIVE     — Multi-edge reasoning (A←B←C triangle)
     ↓
(9) IRAC w/o RP    — Synthesis (anchor only, closed-book)
     ↓
[p2 injection]
     ↓
(10) IRAC w/ RP    — Synthesis (anchor + Research Pack, open-book)
     ↓
[POST-CHAIN ACTIONS]
     ↓
JUDGE EVALUATION   — MEE rubric grades BOTH IRACs (d9 + j10)
CITATION INTEGRITY — Deterministic validation against inventories
```

---

## FDQ Status Summary

| Pos | Question ID | Scoring | FDQ File | Status |
|-----|-------------|---------|----------|--------|
| 1 | KA-SC | Deterministic | `[legal-10] [fdq] 01-ka-sc.md` | ✅ Complete |
| 2 | C-NONEXIST1 | Deterministic | `[legal-10] [fdq] 02-c-nonexist1.md` | ✅ Complete |
| 3 | CANARY | Deterministic | `[legal-10] [fdq] 03-canary.md` | ✅ Complete |
| 4 | FACT-EXTRACT | Deterministic | `[legal-10] [fdq] 04-fact-extract.md` | ✅ Complete |
| 5 | DISTINGUISH | Deterministic | `[legal-10] [fdq] 05-distinguish.md` | ✅ Complete |
| 6 | VALIDATE-AUTH | Deterministic | `[legal-10] [fdq] 06-validate-auth.md` | ✅ Complete |
| 7 | UNKNOWN-AUTH | Deterministic | `[legal-10] [fdq] 07-unknown-auth.md` | ✅ Complete |
| 8 | TRANSITIVE | Deterministic | `[legal-10] [fdq] 08-transitive.md` | ✅ Complete |
| 9 | IRAC w/o RP | Judge | `[legal-10] [fdq] 09-irac without rp.md` | ✅ Complete |
| 10 | IRAC w/ RP | Judge | `[legal-10] [fdq] 10-irac with rp.md` | ✅ Complete |

---

## Post-Chain Actions

| Action | Type | Specification | Status |
|--------|------|---------------|--------|
| Judge Evaluation | Judge Model Call | `[legal-10] [fdq] [post] judge-evaluation-both-iracs.md` | ✅ Complete |
| Citation Integrity | Deterministic | `[legal-10] [fdq] [post] citation_integrity.py.md` | ✅ Complete |

**Judge Evaluation:** Grades both IRACs (d9 + j10) using MEE-style rubric (0–6 per component: Issue, Rule, Application, Conclusion). Returns `total_norm` (0.0–1.0) for each IRAC.

**Citation Integrity:** Validates citations extracted from IRAC outputs against:
- `anchor_inventory_full` — all in-scope citations from anchor text
- `rp_subset` — citations shipped in Research Pack (p2)

---

## Question Families

| Family | Questions | What It Tests |
|--------|-----------|---------------|
| **Known Authority** | KA-SC | Citation landscape comprehension |
| **Canary (Truthfulness)** | C-NONEXIST1, CANARY | Hallucination resistance |
| **Fact Extraction** | FACT-EXTRACT | SCDB code interpretation |
| **Citation Treatment** | DISTINGUISH | Single-edge treatment recognition |
| **Citation Validation** | VALIDATE-AUTH | Cross-source consistency |
| **Citation Discovery** | UNKNOWN-AUTH | Reverse lookup (MRR) |
| **Citation Reasoning** | TRANSITIVE | Multi-edge inference |
| **Legal Writing** | IRAC w/o RP, IRAC w/ RP | Synthesis + citation usage |

---

## Scoring Methods

| Method | Questions | Metric |
|--------|-----------|--------|
| **Exact Match** | 2, 3, 4, 5, 6, 8 | 1.0 if match, 0.0 otherwise |
| **F1 Score** | 1 (in_favor/against lists) | Precision × Recall balance |
| **MRR** | 7 | 1/rank of first correct |
| **Weighted Composite** | 1, 4, 5, 8 | Sub-question weights summed |
| **Classifier** | 2, 3 | Pattern match → PASS/FAIL |
| **MEE Judge Rubric** | 9, 10 | 0–6 per component (I/R/A/C), normalized to 0.0–1.0 |

---

## Data Dependencies

| Table | Used By |
|-------|---------|
| `scdb_cases` | 1, 2, 3, 4, 5, 6, 7, 8 |
| `shepards_edges` | 1, 5, 6, 7, 8 |
| `scotus_citations_ranked_flat` | 1, 5, 7 |
| `citation_inventory` | 3, 6 |

---

## Files in This Directory

```
docs/
├── [legal-10] [fdq] 01-ka-sc.md
├── [legal-10] [fdq] 02-c-nonexist1.md
├── [legal-10] [fdq] 03-canary.md
├── [legal-10] [fdq] 04-fact-extract.md
├── [legal-10] [fdq] 05-distinguish.md
├── [legal-10] [fdq] 06-validate-auth.md
├── [legal-10] [fdq] 07-unknown-auth.md
├── [legal-10] [fdq] 08-transitive.md
├── [legal-10] [fdq] 09-irac without rp.md
├── [legal-10] [fdq] 10-irac with rp.md
├── [legal-10] [fdq] [post] judge-evaluation-both-iracs.md
├── [legal-10] [fdq] [post] citation_integrity.py.md
├── [legal-10] [fdq] [post] irac pair scoring.md
└── [legal-10] [fdq] legal10-steps-chain-overview.md  # This file
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `[legal-10] benchmark technical specification v1.1.md` | Full architecture and contracts |
| `[platform] [legal-10] inter-step requirements.md` | Runner inter-step orchestration |
| `[legal-10] [mvp] 3-step-run-benchmark-structure.md` | MVP vertical slice structure |
| `[platform] [integration] pdrunner based on inspect-ai.md` | Runner implementation notes |

---

## Next Steps

1. **EU Builder Instantiation Queries:** Implement per-FDQ SQL queries for automated EU generation
2. **Runner Integration:** Wire FDQ scoring functions into PDRunner
3. **MVP Completion:** Complete 3-step vertical slice (d1 → d2 → j3 + post-actions)
4. **Platform Integration:** Finalize Langfuse fork integration per `[platform] [integration] langfuse fork and integration.md`

---

_Last updated: 2026-01-25_
