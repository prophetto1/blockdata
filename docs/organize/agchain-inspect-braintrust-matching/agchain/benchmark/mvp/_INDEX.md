# MVP — 3-Step Run Specifications

Milestone 1 (M1) deliverables for the 3-step MVP: d1 (KA-SC) → d2 (IRAC closed-book) → j3 (IRAC open-book) + judge + citation_integrity.

## Reading Order

### Architecture & Deliverables
1. `../_essentials/mvp/M1-buildtime-packaging-sealing-dev-brief.md` — **MOST AUTHORITATIVE**. Frozen decisions on bundle structure, EU schema, benchmark schema, sealing (manifest.json + signature.json). Overrides other docs.
2. `3-step-run-benchmark-structure.md` — 3-step file layout, runner flow, HAL compatibility notes.
3. `run-outputs.md` — Deliverables checklist (checked-in + generated files), data flow diagram, dependency order.
4. `benchmark-technical-specification-v1.1.md` — Overall benchmark technical spec.
5. `build-mvp-task.md` — Task description for building the MVP.

### Canonical MVP FDQs
Use the canonical FDQs in `../fdq/`:
6. `../_essentials/fdq/01-ka-sc.md` — d1 KA-SC spec
7. `../_essentials/fdq/09-irac-without-rp.md` — d2 IRAC closed-book
8. `../_essentials/fdq/10-irac-with-rp.md` — j3 IRAC open-book

The old MVP-local extracts were moved to `../_stale/mvp/`.

### Scorer Reference Code
9. `d1-known-authority-scorer.py.md` — Reference implementation for d1 deterministic scorer
10. `post-citation-integrity.py.md` — Reference implementation for citation integrity post-chain scorer

### Diagrams
- `component_map_3step.png` — 3-step component architecture diagram
- `component_map_backwards_eu_packet.png` — EU packet data flow diagram

## Source Code

All MVP source lives under `runspecs/3-STEP-RUN/`:
```
runspecs/3-STEP-RUN/
  run_3s.py                 # Main runner
  benchmark_builder.py      # Benchmark packet generator
  runtime/                  # Staging, state, audit, message assembly, payload gate
  adapters/                 # Model API adapters (OpenAI, Anthropic)
  scorers/                  # d1_known_authority_scorer, citation_integrity
  benchmark/                # Generated benchmark packet
```

## Key Invariant

`../_essentials/mvp/M1-buildtime-packaging-sealing-dev-brief.md` is the highest-authority document for the MVP. When other docs conflict with it on bundle layout, schema shapes, or sealing requirements — M1 wins.
