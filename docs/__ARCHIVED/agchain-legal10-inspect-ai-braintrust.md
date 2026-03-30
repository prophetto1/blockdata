# AGChain — Canonical Architecture Instruction

**Status:** Permanent reference. Do not archive.
**Last updated:** 2026-03-30
**Purpose:** Eliminate recurring misunderstanding of AGChain's scope, the role of Legal-10, and the relationship between all moving parts.
**Background inventories:** `_agchain/docs/instructions-background/` (code-verified, 2026-03-30)

---

## 1. The Three-Layer Model

| Layer | What it is | Example |
|-------|-----------|---------|
| **AGChain** | Generic benchmark authoring and execution platform | The platform itself |
| **Benchmark package** | A self-contained eval specification: step plans, scorers, payload schemas, ground-truth rules | Legal-10 |
| **Dataset** | Raw data that a benchmark package operationalizes | `_agchain/datasets/` (SCDB, CAP, Shepard's, etc.) |

**AGChain is not Legal-10.** Legal-10 is the first benchmark package hosted by AGChain. AGChain must be able to host benchmark packages for any domain — medical reasoning, code generation, financial analysis, cybersecurity — dictated entirely by what dataset the user provides and what eval they want to create.

---

## 2. Directory Map and Roles

| Path | Role | What Actually Exists |
|------|------|---------------------|
| `_agchain/` | AGChain product root | |
| `_agchain/datasets/` | Raw datasets (~4 GB legal corpus — first dataset, not the only possible dataset) | SCDB, CAP, Shepard's, crosswalks, DuckDB, parquet exports, RPs, EUs |
| `_agchain/legal-10/` | First benchmark package | |
| `_agchain/legal-10/chain/steps/` | 10 chain step implementations (S1-S9, with S5 and S9 having CB+RAG variants) | 10 Python files, Step ABC base class |
| `_agchain/legal-10/chain/scoring/` | Scoring modules | citation_verify, s6/s7 composites, MEE quality judge |
| `_agchain/legal-10/runspecs/3-STEP-RUN/` | Only runspec: 3-step MVP (d1→d2→j3) | runner, runtime, adapters, scorers, benchmark packet |
| `_agchain/legal-10/runs/` | Run artifacts | 1 run (eu__1826-018, Claude Sonnet 3.5) |
| `_agchain/legal-10/src/` | **EMPTY** — all code lives in chain/, runspecs/, scripts/ | Only desktop.ini |
| `_agchain/legal-10/scripts/` | Build pipeline + utilities (27 Python scripts) | 14 data_pipeline + 13 root-level |
| `_agchain/legal-10/tests/` | Test suite (44 tests, all passing) | 6 test files + 1 helper stub |
| `_agchain/legal-10/website/` | Static HTML site (90 pages, no build system) | Tailwind + vanilla JS + AG Grid |
| `_agchain/docs-site/` | AGChain documentation site | |
| `_agchain/docs/` | Planning, requirements, and essential specs | |
| `_agchain/docs/_essentials/` | Authoritative specs for shipped Legal-10 MVP | |
| `_agchain/_reference/` | Reference repos and analysis documents | |
| `_agchain/_reference/inspect_ai/` | Inspect AI source (first-class reference repo) | Full clone (~46K lines Python) |
| `_agchain/_reference/inspect_ai_analysis.md` | Full architecture analysis of Inspect AI | |
| `_agchain/_reference/owner-message.md` | Inspect AI adoption policy (adoption modes) | |
| `_agchain/_reference/agchain-inspect-braintrust-matching/` | Three-way feature comparison docs | |

---

## 3. What Legal-10 Actually Contains (Code-Verified)

### 3.1 The 10-Step Chain (chain/steps/)

| Step | Class | Purpose | Dependencies | Scoring |
|------|-------|---------|--------------|---------|
| S1 | S1KnownAuthority | Extract anchor metadata (cite, name, term) | None | Deterministic: cite+term match |
| S2 | S2UnknownAuthority | Predict citing cases (reverse citator) | S1 | MRR (rank ≤10 = correct) |
| S3 | S3ValidateAuthority | Dual-channel status (curated vs citator) | S1 | Exact flag match |
| S4 | S4FactExtraction | Extract disposition + party_winning | S1 | Both match = 1.0 |
| S5:CB | S5DistinguishCB | Treatment classification (metadata only) | S1, S4 | treatment +0.5, agree +0.5 |
| S5:RAG | S5DistinguishRAG | Treatment classification (full citing opinion) | S1, S4 | treatment +0.5, agree +0.5 |
| S6 | S6IRACSynthesis | Closed-book IRAC synthesis | S1-S5:cb | **Judge-scored** (MEE 0-24) |
| S7 | S7OpenBookSynthesis | Open-book IRAC with Research Pack | S6 | **Judge-scored** (MEE 0-24) |
| S8 | S8CitationIntegrity | **Deterministic** citation gate (no LLM) | S7 | Binary PASS/FAIL |
| S9:CB | S9TransitiveAuthorityCB | 3-case precedent reasoning (metadata) | None | treatment +0.5, agree +0.5 |
| S9:RAG | S9TransitiveAuthorityRAG | 3-case precedent reasoning (opinions) | None | treatment +0.5, agree +0.5 |

### 3.2 The 3-Step MVP (runspecs/3-STEP-RUN/)

The only runspec that exists. Maps to a subset of the 10-step chain:

| MVP Step | Chain Step | Payloads | Scoring |
|----------|-----------|----------|---------|
| d1 | S1 (KA-SC) | p1 only | Deterministic (F1 + exact) |
| d2 | S6 (IRAC closed-book) | p1 only | MEE judge (0-6 x4 = /24) |
| j3 | S7 (IRAC open-book) | p1 + p2 | MEE judge + citation integrity |

Runtime: DirectBackend (OpenAI/Anthropic adapters), replay_minimal session strategy, temp=0.0.
Post-chain: judge_irac_pair (MEE grades both d2+j3) + citation_integrity (deterministic validation).

### 3.3 Build Pipeline (scripts/)

27 scripts that transform raw datasets into sealed evaluation units:

```
Stage 1: build_citation_inventory.py     → citation_inventory.parquet (~1.3M rows)
Stage 2: generate_scotus_crosswalk.py    → scotus_to_scotus_map
         generate_cap_crosswalk.py       → scotus_to_cap_map
Stage 3: build_cap_byte_index.py         → cap_byte_index.parquet
Stage 3.5: rank_scotus_citations.py      → scotus_citations_ranked.jsonl (293K pairs)
           rank_cap_citations.py         → cap_citations_ranked.jsonl (50K pairs)
Stage 3.7: create_ka_views.py            → DuckDB views (ground truth)
Stage 4A: rp_builder.py                  → datasets/rps/rpv1__<caseId>/
Stage 4B: eu_builder.py                  → datasets/eus/<eu_id>/ (p1.json, p2.json, ground_truth.json)
```

### 3.4 Test Coverage

44 tests, all passing. Strong coverage for runtime/config/profiles. **7 of 9 chain steps lack unit tests.** Zero coverage for data pipeline scripts.

### 3.5 Website

90-page pure static HTML site. Tailwind + vanilla JS. 6-pillar methodology documentation. Leaderboard with AG Grid. Dual-mode data (static JSON or Supabase). No build system.

---

## 4. The Dataset → Benchmark Package Relationship

Datasets are raw materials. Benchmark packages operationalize them.

For Legal-10 specifically:
- **Datasets** (`_agchain/datasets/`): ~4 GB — SCDB (21K SCOTUS cases), CAP full-text opinions (1.1 GB appellate), Shepard's citation network (1 GB), crosswalks, DuckDB (739 MB), ranked citations
- **Legal-10 package** (`_agchain/legal-10/`): Defines the chained eval through step contracts (S1-S9), scoring rubrics (deterministic + MEE judge), build pipeline (27 scripts, 8 stages), sealed bundle format (benchmark.json + plan.json + model_steps + judge_prompts), and a 90-page documentation website

The operationalization path:
```
raw dataset → build pipeline (8 stages) → sealed EUs (p1.json, p2.json, ground_truth.json)
    → runtime execution (3-step MVP or full 10-step) → scoring (deterministic + judge)
    → artifacts (summary.json, run.jsonl, audit_log.jsonl, candidate_state.json)
```

This same pattern must work for any future benchmark: a different dataset feeds a different benchmark package with different step plans and different scorers. AGChain provides the platform machinery; the benchmark package provides the domain logic.

---

## 5. Inspect AI — Why It Matters and How to Use It

Read `_agchain/_reference/owner-message.md` for the full policy. Summary:

Inspect AI (UK AISI, MIT-licensed, ~46K lines Python) is a mature eval framework with:
- Task/Solver/Scorer/Agent/Tool protocols
- 26 model providers
- Dataset loaders, event system, logging, CLI, View UI
- Registry-based plugin architecture

**Adoption modes (in preference order):**

1. **Use directly** — Inspect already does what we need at the right abstraction boundary. Call it directly.
2. **Compose around it** — Inspect has the right substrate but AGChain needs its own interface, policy, or orchestration on top. Wrap it.
3. **Port and customize** — Inspect has valuable logic but a thin wrapper is the wrong seam. Bring the implementation into AGChain-owned code and modify it.
4. **Reference only** — Inspect is useful only as inspiration. Build independently.

**Decision rule:** The question is not "Does Inspect already do this?" The question is "Which adoption mode is correct here?"

**Constraint:** Only build fully independent when there is clear rationale (requirements materially exceed Inspect's scope, architecture is opposed, platform incompatible).

**Note:** Legal-10 already has an InspectBackend in `runspecs/3-STEP-RUN/runtime/inspect_backend.py` — the integration seam exists but is optional (default is DirectBackend).

---

## 6. Braintrust — Frontend Reference

Braintrust is closed-source. We cannot use its backend or source code. But its frontend UI is publicly visible and can serve as a visual reference.

**When to use Braintrust as reference:**
- When Inspect AI is weak on frontend/UI for a feature we need
- When our planned feature aligns visually with what Braintrust shows
- When having a visual target can accelerate backend development that lacks direct source code guidance

**The three-way comparison** (`_agchain/_reference/agchain-inspect-braintrust-matching/`):
If a feature is found across AGChain requirements, Inspect AI source, and Braintrust frontend — we have both a source code basis (Inspect) and a visual target (Braintrust) to build from efficiently.

---

## 7. Essential Documentation (Authority Hierarchy)

Per `_agchain/docs/_essentials/_INDEX.md`, the absolute source-of-truth documents for the shipped Legal-10 MVP are:

1. `_essentials/mvp/M1-buildtime-packaging-sealing-dev-brief.md` — bundle layout, schema, sealing
2. `_essentials/platform/inter-step-requirements.md` — runtime behavior, staging, admission, state, audit
3. `_essentials/fdq/01-ka-sc.md` — d1 step contract
4. `_essentials/fdq/09-irac-without-rp.md` — d2 step contract
5. `_essentials/fdq/10-irac-with-rp.md` — j3 step contract
6. `_essentials/fdq/post/irac-pair-scoring.md` — judge grading contract
7. `_essentials/fdq/post/citation_integrity.py.md` — post-chain citation integrity

The platform-level requirements and understanding documents:
- `_essentials/2026-03-26-agchain-platform-requirements.md` — what AGChain must do
- `_essentials/2026-03-26-agchain-platform-understanding.md` — why these requirements are defensible

All paths are relative to `_agchain/docs/`.

---

## 8. Required Reading Order for Any New Session

Any agent or session working on AGChain must read these documents in order before proposing work:

1. **This document** — establishes the three-layer model and directory map
2. **`_agchain/_reference/owner-message.md`** — Inspect AI adoption policy and modes
3. **`_agchain/docs/_essentials/_INDEX.md`** — authority hierarchy for Legal-10 specs
4. **`_agchain/docs/_essentials/2026-03-26-agchain-platform-requirements.md`** — platform requirements (sections 1-3 minimum)
5. **`_agchain/_reference/inspect_ai_analysis.md`** — Inspect AI architecture (sections 1, 10, 16-17 minimum)

Only after reading these should work begin.

---

## 9. Common Misunderstandings — Do Not Repeat These

| Wrong | Right |
|-------|-------|
| AGChain is a legal benchmark | AGChain is a generic benchmark platform. Legal-10 is its first benchmark package. |
| The datasets directory is AGChain's data | Datasets are raw materials. Benchmark packages operationalize them. |
| AGChain should be built Legal-10-specific | AGChain must support any domain. Legal-10 specifics belong in the Legal-10 package, not the platform. |
| We should build everything from scratch | Check Inspect AI first. Use the adoption modes. |
| Braintrust is a backend reference | Braintrust is closed-source. Frontend visual reference only. |
| The 3-step MVP is the full product | The 3-step chain is the current executable slice of a 10-step chain (S1-S9 with variants). AGChain itself is not limited to any step count. |
| Inspect AI should be copied wholesale | Use the four adoption modes. Prefer use directly > compose > port > reference only. |
| Code lives in legal-10/src/ | src/ is empty. Code lives in chain/, runspecs/, scripts/, tests/, website/. |
| The chain has 3 steps | The chain has 10 steps (S1-S9, with S5 and S9 each having CB+RAG variants = 12 implementations). The 3-step MVP (d1/d2/j3) maps to S1/S6/S7. |

---

## 10. The Path Forward

The interrelationship codified and mapped to Inspect AI:

```
Raw Datasets (any domain)
    ↓ build pipeline (Legal-10: 27 scripts, 8 stages)
Sealed Evaluation Units (p1.json, p2.json, ground_truth.json)
    ↓ AGChain platform registration
Registered Benchmark (benchmark.json + plan.json + model_steps + judge_prompts)
    ↓ AGChain runtime (model selection, policy config via RuntimeConfig)
Execution (step plans via Solver chains, tool calls, scoring)
    ↓ AGChain artifact store
Results (summary.json, run.jsonl, audit_log.jsonl — scores, traces, comparisons)
```

Each stage has an Inspect AI counterpart:

| AGChain Stage | Inspect AI Equivalent | Adoption Mode to Decide |
|--------------|----------------------|------------------------|
| Datasets (raw) | `Dataset` / `Sample` | Use directly or compose |
| Benchmark registration | `@task` registry | Compose around it |
| Runtime config | `GenerateConfig` / `eval()` params | Port and customize (AGChain has RuntimeConfig with phase-gated validation, profile system) |
| Step plans | `Solver` chains / `chain()` composition | Port and customize (AGChain steps have coverage tiers, payload gating, state sanitization) |
| Scoring | `Scorer` / `Metric` | Compose (deterministic scorers are AGChain-specific; MEE judge pattern is unique) |
| Artifacts | `EvalLog` / `EvalSample` | Port and customize (AGChain has audit_log.jsonl with SHA-256, candidate_state sanitization) |
| Traces | `Event` system / `Timeline` | Use directly or compose |

The adoption mode for each stage must be decided explicitly using the policy in section 5.

---

## 11. Background Reference

Detailed code inventories (every file, class, function, and data flow documented) are at:

| File | Contents |
|------|----------|
| `_agchain/docs/instructions-background/legal10-chain-inventory.md` | All 10 chain steps + 6 scoring modules + dependency graph |
| `_agchain/docs/instructions-background/legal10-runspecs-inventory.md` | 3-step MVP: runtime, adapters, scorers, benchmark packet, execution flow |
| `_agchain/docs/instructions-background/legal10-scripts-inventory.md` | 27 build pipeline scripts, 8 stages, dataset sizes |
| `_agchain/docs/instructions-background/legal10-tests-inventory.md` | 44 tests, coverage strengths and gaps |
| `_agchain/docs/instructions-background/legal10-runs-inventory.md` | 1 existing run, artifact format |
| `_agchain/docs/instructions-background/legal10-website-inventory.md` | 90-page static site, stack, data sources |
| `_agchain/docs/instructions-background/legal10-src-status.md` | src/ is empty — code lives elsewhere |
