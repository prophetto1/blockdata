# Essentials Index

Everything an agent or session needs to understand AGChain before doing work.

## Start Here

1. `agchain-canonical-instruction1.md` — **Read first.** Four-Layer Model, directory map, Inspect AI policy, common misunderstandings. References everything below.

## Code-Verified Inventories (2026-03-30)

2. `01-proven-kernel-inventory.md` — 3-step MVP runtime: run_3s.py, input_assembler, payload_gate, state sanitization, audit, model adapters. Includes proven run artifacts.
3. `02-chain-steps-inventory.md` — All 10 chain steps (S1-S9 with CB/RAG variants), 6 scoring modules, dependency graph.
4. `03-platform-implementation-state.md` — Frontend routes, shell layout, 21 components, backend endpoints, DB migrations, observability counters.
5. `04-inspect-ai-adoption-map.md` — Module-level keep/replace/compose/augment decisions. 16 gaps AG chain must own. 5-phase migration sequence.
6. `05-build-pipeline-and-datasets.md` — 8-stage pipeline from raw datasets to sealed EUs. Dataset inventory (~4 GB). Bundle structure.
7. `legal10-tests-inventory.md` — 44 tests (all passing), coverage strengths and gaps.
8. `legal10-website-inventory.md` — 90-page static site: stack, pages, data sources, database schema.

## Platform Requirements

9. `2026-03-26-agchain-platform-requirements.md` — What AGChain must do.
10. `2026-03-26-agchain-platform-understanding.md` — Why these requirements are defensible.

## Inspect AI Integration

11. `2026-03-27-inspect-runtime-helper-maximization-analysis.md` — Full runtime helper analysis.
12. `2026-03-27-environment-profile-research-prompt.md` — Environment profile research.

## Benchmark Specifications

13. `benchmark-package-structures-v4.md` — Bundle layout, schema, sealing rules.

## Subdirectories

- `build-pipeline/` — Data pipeline reference, EU/RP builder docs, DB schema, security.
- `docs-analysis/` — Doc classification ledger, intent summaries, internal inventory.
- `fdq/` — Step contracts: `01-ka-sc.md`, `09-irac-without-rp.md`, `10-irac-with-rp.md`, post-chain scoring.
- `mvp/` — 3-step run structure, technical spec, build task, scorer docs, run outputs.
- `platform/` — (in parent `_agchain/docs/platform/`) Architecture, environment profiles, runner specs.

## Memory and Triage

14. `0131-135-mdfixed-memory.jsonl` — Cleaned legacy memory (124 entries, stale entries removed).
15. `2026-03-30-memory-current-triage.md` — Triage analysis of the JSONL.

## Owner Intent Records

16. `Owner-Message-Save-To-Memory.md` — Inspect AI adoption + Braintrust frontend strategy.
17. `what-we-need-asap.md` — Braintrust three-way comparison urgency.
