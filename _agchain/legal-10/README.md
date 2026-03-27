# L-10

**A chained benchmark for evaluating legal reasoning in Large Language Models.**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Website](https://img.shields.io/badge/website-legal--10.vercel.app-blue)](https://legal-10.vercel.app/)
[![Status](https://img.shields.io/badge/status-v0.8_development-orange.svg)](https://github.com/prophetto1/l10-bench)

---

## Why Legal-10?

Existing legal AI benchmarks evaluate tasks in parallel. Case identification, fact extraction, and legal analysis are measured separately, then scores are aggregated. But this approach misses a core characteristic of actual legal work—**error propagation**.

Legal research is a sequential workflow. The output of one step becomes the input to the next, and errors at early stages propagate through the entire chain. Even with 90% accuracy at each step, completion rate for a 10-step chain falls below 35%.

**Legal-10** is a chained/agentic legal benchmark designed to address this problem. The first release, **AG8**, consists of an 8-step chain (S1-S8) with a **deterministic citation integrity gate** at the final step. It extracts U.S. Reports citations from the model's generated legal analysis and verifies whether those citations actually exist. If even one citation is fabricated, the entire synthesis is voided.

Citation **relevance** is calculated deterministically using treatment labels from the Shepard's Citation Network—human-curated editorial classifications accumulated since 1873, used as an oracle.

To our knowledge, this is the first chained legal benchmark with deterministic research packs and a citation verification gate.

---

## What Legal-10 Does Differently

| Gap                         | Parallel Benchmarks     | Legal-10                       |
| --------------------------- | ----------------------- | ------------------------------ |
| Error propagation           | Errors isolated         | Errors cascade through chain   |
| Hallucination testing       | Atomic (single-step)    | Across full workflow (S8 gate) |
| Reasoning vs copying        | Not measured            | S5 dual-modality gap           |
| Professional responsibility | Fabrication = one error | Fabrication = chain failure    |

---

## The 10-Step Chain

```
RULE PHASE              APPLICATION PHASE        SYNTHESIS PHASE
------------            -----------------        ---------------
S1 -> S2 -> S3    ->    S4 -> S5 (cb/rag)   ->  S6 -> S7 -> S8

Identify &              Extract facts &          Synthesize &
validate                apply precedent          verify integrity
authority

ADVANCED AUTHORITY PHASE
------------------------
S9 -> S10

Transitive authority & oral argument grounding
```

| Step | Name                    | Task                                       | Ground Truth      |
| ---- | ----------------------- | ------------------------------------------ | ----------------- |
| S1   | Citation Identification | Extract case metadata from opinion         | SCDB              |
| S2   | Unknown Authority       | Find cases citing the anchor case          | Shepard's         |
| S3   | Authority Validation    | Report overruling status (dual-channel)    | SCDB + Shepard's  |
| S4   | Fact Extraction         | Extract disposition and winning party      | SCDB codes        |
| S5   | Treatment               | Predict how citing case treats cited case  | Shepard's `agree` |
| S6   | IRAC Synthesis (CB)     | Closed-book synthesis from chain artifacts | MEE rubric        |
| S7   | IRAC Synthesis (OB)     | Open-book synthesis from ResearchPack      | ResearchPack      |
| S8   | Citation Integrity      | **GATE**: Verify no fabricated citations   | Deterministic     |
| S9   | Transitive Authority    | Trace precedent through A->B->C triangle   | Triangle data     |
| S10  | Oyez Oral Argument      | Predict winner from oral argument          | Oyez + SCDB       |

---

## Key Innovations

### The S8 Integrity Gate

If S8 detects any fabricated citation in S7 output, **the entire synthesis is voided**. This operationalizes Model Rule 3.3(a)(1): a brief with one fabricated citation is professionally worthless, regardless of how well-reasoned the other 99% may be.

### The Reasoning Bridge (S5 Dual-Modality)

S5 runs in two variants:

- **S5:cb** (Closed-Book): Model receives only metadata and S4-extracted facts
- **S5:rag** (RAG): Model also receives the citing case's opinion text

The gap between S5:rag and S5:cb accuracy reveals whether a model is **reasoning** or **copying**:

| S5:rag | S5:cb | Interpretation                         |
| ------ | ----- | -------------------------------------- |
| High   | High  | Model reasons well                     |
| High   | Low   | Model copies from text, doesn't reason |
| Low    | Low   | Model cannot perform the task          |

### Professional Standards Grounding

Legal-10 operationalizes legal work as **Research Execution**—the integrated professional competency of completing a legal research task from question to answer. The benchmark is grounded in:

- **MacCrate Report** (ABA, 1992): Legal research as fundamental lawyering skill
- **AALL Principles** (2013): Competent researcher synthesizes doctrine across similar cases
- **Shultz & Zedeck** (2011): 26 lawyering effectiveness factors derived from practitioner surveys

---

## AG8: The S1-S8 Baseline Benchmark

> **FROZEN BASELINE v1.0**: RPv1 = SelectionManifest v1 + ResearchPack wrapper (DOC1 anchor text capped, DOC2 Top-K=12 usage snippets capped, DOC3 manifest verbatim). S8 fails if S7 contains zero literal U.S. Reports citations.

**AG8** is Legal-10's first chained/agentic legal benchmark (S1–S8). It evaluates intermediate research skills through open-book synthesis and then enforces a **deterministic citation integrity gate** that fails closed on fabricated or missing U.S. Reports citations.

AG8 uses deterministic citation extraction from SCOTUS opinion text and triangulates citation relevance using **Shepard's treatment labels** as a universal, human-curated oracle. RPv1 keeps context bounded by shipping only the anchor opinion plus evidence-linked usage snippets and a deterministic selection manifest, rather than full cited-case texts.

---

## Data Sources

Legal-10 uses data derived from:

- **Supreme Court Database (SCDB)** - Case metadata and dispositions
- **Shepard's Citation Network** - Treatment relationships between cases
- **Oyez Project** - Oral argument transcripts
- **Dahl et al. (2024)** - Overruling annotations and fabricated citation sets

Data access and setup instructions coming soon.

---

## Scoring Architecture

**9 of 10 steps use deterministic scoring**, minimizing LLM-as-judge circularity:

| Step   | Scoring Method                                                 |
| ------ | -------------------------------------------------------------- |
| S1-S4  | Exact match (with canonical normalization)                     |
| S5     | Binary match on `agrees` field                                 |
| S6     | Composite: 10% structural + 40% chain consistency + 50% rubric |
| S7     | Citation density + document usage                              |
| S8     | Binary: all citations valid or void                            |
| S9-S10 | Binary match                                                   |

### Chain Metrics

| Metric                | Definition                                    |
| --------------------- | --------------------------------------------- |
| Chain Completion Rate | Instances where all steps have `correct=True` |
| Mean Failure Position | Average index of first incorrect step         |
| Void Rate             | Instances where S8 voided the chain           |

---

## Architecture

```
legal-10/
├── chain/                  # Execution engine
│   ├── backends/           # LLM adapters (Anthropic, OpenAI, Mock)
│   ├── steps/              # S1-S10 step implementations
│   ├── runner/             # ChainExecutor state machine
│   ├── datasets/           # Data loaders & builders
│   └── observability/      # Langfuse tracing
├── core/                   # Stable contracts & scoring
│   ├── scoring/            # Deterministic scorers + S8 gate
│   ├── prompts/            # Prompt resolution
│   ├── ids/                # Citation canonicalization
│   └── reporting/          # JSONL output
├── shared/contracts/       # Pydantic/dataclass models
├── L1/                     # Governance (Constitution, Ledger)
├── L2/                     # Performance (runs, ResearchPacks)
│   └── runs/               # Run specifications & artifacts
├── public/                 # Benchmark website (legal-10.vercel.app)
├── scripts/                # CLI tools
└── docs/                   # Documentation
```

---

## Observability

Legal-10 integrates with **Langfuse** for enterprise-grade tracing:

- Full chain -> step -> generation hierarchy
- Real-time score streaming
- Prompt version management
- Run tagging and filtering

---

## Contributing

We welcome contributions. Please see the governance model in `L1/CONSTITUTION.md` for workflow requirements:

1. All changes use the **Proposed-First** rule (`*_proposed.py` files)
2. Integration requires explicit user approval
3. Run full test suite before PR

---

## Citation

```bibtex
@article{legal10_2025,
  title={Legal-10: A Chained Benchmark for Evaluating Legal Reasoning in Large Language Models},
  author={Chung, Jon W.},
  year={2025},
  url={https://legal-10.vercel.app}
}
```

---

## Acknowledgments

Legal-10 builds on the foundational work of:

- **Dahl et al. (2024)** for legal hallucination taxonomy and data
- **Supreme Court Database (SCDB)** for case metadata
- **LexisNexis Shepard's** for citation relationships
- **Oyez Project** for oral argument transcripts

---

## License

MIT License. See [LICENSE](LICENSE) for details.
