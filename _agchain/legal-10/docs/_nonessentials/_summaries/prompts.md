# -prompts

This subdirectory contains prompt engineering documents — specifically, instruction briefs authored for AI agents to consume and act upon. These are not prose documentation; they are operational prompts that drive generation of other artifacts (specifications, assessments, sweeps). As of the current documentation state, the subdirectory contains one file.

---

## documented-specification.md

### Purpose and Goal

This file is a **task brief and prompt**, not a specification document itself. Its purpose is to commission an AI agent (referred to as a "3rd party") to perform a comprehensive sweep of the entire `legal-10` documentation corpus and produce a consolidated, objective specification document for the **3-Run MVP** (also referred to as the "3-Step MVP") of the Legal-10 benchmark system.

The document instructs the agent to:
1. Read every document listed in the brief
2. Synthesize those documents into a single updated specification
3. Describe what the desired end-result product looks like, what its features and functionalities are, and how each of the three core artifact packages (RP, EU, and Benchmark) are structured and assembled

This file is, in effect, the **originating prompt** for the consolidated specification documents found in `specifications/3-step-mvp-consolidated-spec.md` and `specifications/02092026.md`.

### Document Corpus Referenced

The brief lists 46 source documents (at their original pre-reorganization paths under `E:\agchain\legal-10\docs\`) spanning every major concern area of the system:

**Dataset / Schema docs:**
- `[C] [datasets] sc-dataset_db-schema.md`
- `[C] data-pipeline-reference.md`
- `[C] datasets-implications.md`

**Platform / Runtime docs:**
- `[C] [legal-10] [fdq] [10-s] legal10-steps-chain-overview-v1.1.md`
- `[C] [legal-10] benchmark technical specification v1.1.md`
- `[C] [platform] [integration] langfuse fork and integration.md`
- `[C] [platform] [integration] pdrunner based on inspect-ai.md`
- `[C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md`
- `[C] [platform] [legal-10] inter-step requirements.md`
- `[C] [platform] [prompts] prompt-messages.md`
- `[C] [platform] statefulness-context-persistence.md`

**FDQ (Formal Delivery Query) step specs:**
- `[legal-10] [fdq] 00-TEMPLATE-v2.md` (template)
- `[legal-10] [fdq] 01-ka-sc.md` through `10-irac with rp.md` (all 10 step specs)
- `[legal-10] [fdq] 02-c-nonexist-groundtruth-precheck.md`
- Post-processing: `citation_integrity.py.md`, `irac pair scoring.md`, `judge-evaluation-both-iracs.md`
- New variants: `04-fact-extract-new.md`, `05-distinguish-new.md`, `08-transitive-new.md`

**MVP-specific docs:**
- `[legal-10] [mvp] 3-step-run-benchmark-structure.md`
- `[legal-10] [mvp] 7_milestone-1-buildtime-packaging-sealing-dev-brief.md`
- `[legal-10] [mvp] d1_known_authority_scorer.py.md`
- `[legal-10] [mvp] fdq-01-ka-sc.md`, `fdq-02-irac without rp.md`, `fdq-03-irac with rp.md`
- `[legal-10] [mvp] post_citation_integrity.py.md`
- `[legal-10] [mvp] run-outputs.md`

**EU / RP builder docs:**
- `[platform] [eu] build_eus.py.md`
- `[platform] [eu] builder notes.md`
- `[platform] [eu] sealed evaluation units-security.md`
- `[platform] [pp] package_research_packs.py.md`

**Prompts / Tasks:**
- `[platform] [prompt] prompts_v1.0.md`
- `build-mvp-task.md`

### Key Concepts

- **3-Run MVP / 3-Step MVP:** The minimum viable product scope — a benchmark run using three evaluation steps (step 01 Known Authority, step 09 IRAC without RP, step 10 IRAC with RP).
- **RP (Research Pack):** One of the three build-time artifact packages. Contains curated legal source material for a benchmark question.
- **EU (Evaluation Unit):** One of the three build-time artifact packages. A sealed, tamper-evident bundle of RP + question + metadata delivered to the runner.
- **Benchmark package:** One of the three build-time artifact packages. The full collection of EUs plus benchmark metadata.
- **3rd party:** The AI agent being addressed — meant to approach the synthesis without prior context bias.
- **Run-spec:** The complete specification governing a benchmark run, from data assembly through scoring.

### Intent and Scope

The brief is intentionally minimal in its instructions — it says what to produce (a consolidated specification) and what the output should describe (features, functionalities, RP/EU/Benchmark package assembly) without prescribing how. This is a deliberate "fresh eyes" delegation: the commissioning author wants an unbiased synthesis, not a document constrained by the author's own framing.

The output was to be written showing the **desired end-result product** — meaning a forward-looking spec, not a description of current state.

### Historical / Structural Context

The file paths reference the old directory layout (`E:\agchain\legal-10\docs\` with bracket-prefixed filenames), predating the reorganization into concern-based subdirectories (`fdq/`, `platform/`, `build-pipeline/`, `mvp/`, etc.). This places the prompt's authorship before the 2026-01-31 monorepo absorption and directory restructure.

### References to Other Documents

All 46 documents listed are the source material. The direct outputs of this prompt are:
- `specifications/3-step-mvp-consolidated-spec.md`
- `specifications/02092026.md`

### Key Takeaways

- This file is a delegation prompt, not a specification — it commissions synthesis rather than providing content.
- It covers the full document corpus of the project at the time of writing: 46 source files across all concern areas.
- The "3rd party" framing is deliberate — the author wanted objective synthesis, not a reflection of existing bias.
- File paths use the old pre-reorganization bracket-naming convention, dating this prompt to before the Jan 31 monorepo restructure.
- The three output deliverables are the RP package, EU package, and Benchmark package — their assembly is the heart of what the commissioned spec should describe.
- The direct output artifacts from this prompt now live in `specifications/`.

---

## Cross-Document Themes

The `-prompts` subdirectory functions as a **meta-layer** — it is not documentation of what the system does, but documentation of how documentation itself was created. The single file present is an agent-commissioning prompt that drove the production of the consolidated spec.

This pattern — using structured AI agent briefs to synthesize documentation across large document corpora — appears to be a recurring practice in this project. The existence of this subdirectory as a distinct concern area suggests the team treats prompt-driven synthesis as a first-class artifact worth versioning and preserving.

The subdirectory is otherwise sparse, suggesting either: (a) most prompts were informal and not filed here, or (b) this subdirectory was established late and only caught a subset of commissioning prompts.
