**IMPORTANT:** This document to be updated into the one canonical product and technical specification for the Legal-10 Evaluation Benchmark, including describing how the benchmark integrates into the AGChain platform. Currently, the scope of such integration includes compatibility, integration and inter-operability between the PDRunner and Legal-10.

TODO:  
Requires precise, line-by-line, low level review for update.






# Legal-10 Benchmark — Product & Technical Specification (v1.0)

---

## A) One-Page Overview

### Purpose

Legal-10 is a runner-orchestrated benchmark that evaluates an LLM's ability to perform **stateful, multi-step legal reasoning** over a **sealed, staged evidence set**—specifically: 
(1) closed-book reasoning from an anchor SCOTUS opinion; and 
(2) open-book synthesis after admitting a Research Pack (RP). 

The benchmark explicitly tests **information discipline** and **citation integrity**, with deterministic checks designed to be reproducible and auditable.

### Scope

* plan-driven execution; per-step staged deliveries; candidate state carry-forward; deterministic scoring components; judge-scored IRAC quality; per-run audit artifacts; dataset-built EUs with p1 (anchor) and p2 (RP).

* legal-10 has an mvp version which is currently being worked to complete first- "3-step mvp" which is structurally the same as the final legal-10 with just a smaller number of steps and questions. (final benchmark and eu packages are structurally identical with just a smaller number of steps and questions)

### Key Characteristics - Architectural

1. **Structural no-leak via staging directories:** The evaluated model can only read files copied into a per-call staging directory; ground truth/judge prompts/future steps are never staged.
2. **Plan-driven admission and orchestration:** `plan.json` is the single source of truth for step order, payload admissions, scoring mode, and output contracts.
3. **Runner-enforced statefulness:** Statefulness is defined as a protocol property enforced by the Runner, using a sanitized `candidate_state.json` carry-forward.
4. **Sealed evidence (Research Packs):** EU payloads are built at build time; no runtime lookups; hashing/verifiability is intended for reproducibility.
5. **Information discipline + integrity checks:** Canary PASSING/DETAILED labeling and citation integrity/fabrication checks are deterministic (design intent).
6. **Managed state with auditability:** Statefulness is implemented via Runner-managed providers; baseline is a serialized `candidate_state.json` ringbuffer/carry-forward, with optional pinned context / session store / temporal fact store—all serializable and included in `audit_log.jsonl`.
7. **Integrity instrumentation:** Deterministic canary labeling (PASSING vs DETAILED) and a deterministic citation integrity verifier with synthetic traps to detect hallucinated citations/leakage.

### Architecture at a Glance (Components + Trust Boundaries)



                 ┌──────────────────────────────────────────┐
                 │          Benchmark Packet (static)        │
                 │ benchmark.json  plan.json                 │
                 │ model_steps/d*.json  model_steps/j*.json  │
                 │ judge_prompts/j*.json                     │
                 └───────────────┬──────────────────────────┘
                                 │
                                 │ plan-driven orchestration
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                        Plan-Driven Runner    
│  - EU loader (p1, p2...) + ground_truth    runner-only)            │
│  - Staging manager (copy-only admitted files per call)             │
│  - State manager (candidate_state.json; sanitized; hashable)       │
│  - Scoring (deterministic) + Judge orchestration (judge model)     │
│  - Logging: run.jsonl, audit_log.jsonl, run_manifest.json, summary │
└───────────────┬───────────────────────────────┬────────────────────┘
                │                               │
                │ staged files only             │ judge sees rubric + outputs only
                ▼                               ▼
      ┌───────────────────┐           ┌──────────────────────┐
      │ Evaluated Model   │           │ Judge Model          │
      │ (candidate)       │           │ (isolated)           │
      │ sees: step file(s)│           │ sees: judge prompt   │
      │ + admitted payloads │         │ + candidate outputs  │
      │ + candidate_state   │         │                      │
      └───────────────────┘           └──────────────────────┘
```
- payload_packager.py: generalized component name. packages payloads included in the evaluation. 

In legal-10, referred to as the rp-packager. 

eu_builder.py: builds the evaluation unit (EU) 
- runspect_

**Data Pipeline to Runtime:**

```
(Data pipeline)                         (Export)                         (Runtime execution)
SCDB + CAP + Shepard's edges  ──▶  EU Builder + Runspec Exporter  ──▶  PDRunner

EU packet (sealed): p1, p2, ground_truth             Benchmark packet: plan.json + model_steps + judge_prompts

Per step/call:
  stage only admitted files ──▶ build messages (+ carry-forward) ──▶ evaluated model call

Scoring:
  deterministic scorers (d*) and isolated judge scorer (j*) ──▶ logs: run.jsonl + audit_log.jsonl + manifest + summary
```

---

## B) Full Specification

## 1. Product Definition & Scope

### 1.1 What the Benchmark Is

* The benchmark **MUST** be executed as a **plan-driven, Runner-orchestrated protocol** where "statefulness" is enforced externally (Runner), not assumed as a model capability.
* The benchmark **MUST** evaluate an LLM across a **multi-step chain** over a single Evaluation Unit (EU), with **explicit payload admission boundaries** controlling what evidence is available at each step.
* The benchmark **MUST** enforce "admissibility" as a machine-enforced property (structural no-leak), not an honor system.

### 1.2 What It Measures

Legal-10 **SHOULD** be treated as measuring (at minimum):

* **Closed-book reasoning from provided anchor text** (evidence discipline: use only admitted text).
* **Open-book synthesis** once the Research Pack (RP) is admitted (ability to integrate provided authorities).
* **Information discipline / refusal when evidence is withheld**, especially on PASSING citations.
* **Citation discipline/integrity**, via deterministic checks on citations used in drafted IRAC outputs (and/or additional authenticity checks).
* **Protocol-following under evidence constraints:** the model uses only admitted text and returns outputs matching the response contract.
* **Chained workflow competence:** step outputs become inputs (via carry-forward), so early errors propagate and are detectable.
* **Citation integrity / hallucination resistance:** fabricated citations are detected via deterministic verification against SCDB plus synthetic traps; canary labels reward "insufficient information" for PASSING citations.

### 1.3 What It Does NOT Cover

* The benchmark **MUST NOT** allow continuity of candidate session state across EUs (no cross-EU learning).
* Baseline AG10 statements **MUST NOT** assume state-reporter citation integrity scoring is in scope; state reporters are out of scope for deterministic citation integrity in the provided step spec.
* Baseline AG10 statements **MUST NOT** treat Oyez/oral-argument evaluation as part of AG10 baseline.
* Step types whose specs are explicitly "Placeholder" **MUST NOT** be treated as fully specified.

### 1.4 Target Users and Intended Usage

* The benchmark **MUST** support usage by technical evaluators for **reproducible model comparison**, including audit and provenance review (provable what-bytes-when).
* The benchmark **MUST** support **auditable comparisons** across model versions via deterministic scoring where possible, plus isolated judge scoring for synthesis.
* The benchmark **SHOULD** support packaging suitable for procurement/audit contexts where the evaluator can re-run using sealed inputs without database dependencies.
* The benchmark **SHOULD** support research and procurement use cases by emitting run artifacts sufficient for independent verification/re-run.

---

## 2. System Architecture Overview

### 2.1 Major Components

The system **MUST** comprise the following logical components:

1. **Benchmark packet** (shared, baked into runner distribution):

   * `benchmark.json` (benchmark metadata + judge configuration)
   * `plan.json` (step orchestration and payload admissions)
   * `model_steps/*.json` (evaluated-model prompts)
   * `judge_prompts/*.json` (judge rubric prompts)

2. **EU packet** (selected per run; sealed inputs):

   * `p1.json` (anchor payload; admitted as scheduled)
   * `p2.json` (research pack payload; admitted at open-book boundary)
   * `ground_truth.json` (runner-only; never staged)

3. **PD-Runner**:

   * Orchestrates step execution per `plan.json`
   * Manages staging and delivery gating
   * Maintains sanitized candidate state
   * Performs deterministic scoring and judge calls
   * Emits run artifacts (run logs, audit logs, manifest, summary)

4. **Evaluated model adapter**:

   * Reads only staged files and sends model API calls.

5. **Judge model adapter** (isolated):

   * Called only for judge-scored components; does not share candidate transcript.
   * Transcript must remain isolated from evaluated-model state.

6. **Deterministic scorer registry**:

   * Resolves `scorer_ref` IDs for deterministic steps.

### 2.2 Trust Boundaries and Isolation Model (Who Can See What)

* The Runner **MUST** enforce a **No-Leak Envelope** via staging: the evaluated model can access only the current step prompt(s), admitted payloads, and sanitized candidate state.
* The Runner **MUST NOT** stage:

  * `ground_truth.json`
  * `judge_prompts/*`
  * future step files
  * unadmitted payloads
  * other EUs' data

* The Judge model **MUST** see only judge rubric prompts and evaluated model outputs being scored, and **MUST NOT** have access to the evaluated model session transcript unless explicitly provided.
* **Open decision (trust boundary vs framework):** Wrapping the full protocol inside Inspect can violate physical separation because Inspect loads all sample data at task start, potentially exposing ground truth via in-memory `metadata`.

### 2.3 Stateful Delivery Model

* The system **MUST** be able to represent statefulness via Runner-managed providers; the evaluated model is passive (does not write memory or request updates).
* The Runner **MUST** support at least the baseline "Type 0" provider: serialized `candidate_state.json` used for inter-step persistence of model-derived artifacts.
* State **MUST** be per-EU; no provider **MAY** carry information across EUs ("No Global Learning").


---

## 3. Benchmark Artifacts & Packaging

### 3.1 Package Structure (Required)

The benchmark **MUST** conform to the following on-disk structure (conceptual root paths shown):

**Benchmark packet (static):**

```
benchmark/
  benchmark.json
  plan.json
  model_steps/  (d*.json, j*.json)
  judge_prompts/ (j*.json)
```

**EU packet (per instance):**

```
eus/{eu_id}/
  p1.json
  p2.json
  ground_truth.json   # runner-only; never staged
```

**Runtime artifacts (per run):**

```
runs/{run_id}/
  run.jsonl
  audit_log.jsonl
  run_manifest.json
  summary.json
```

**Staging (transient, per call):**

```
staging/{run_id}/{call_id}/
  <step>.json (current step prompt file(s))
  p*.json     (admitted payloads only)
  candidate_state.json
```

### 3.2 Contracts and Schemas

#### 3.2.1 benchmark.json

* `benchmark.json` **MUST** contain judge configuration and benchmark metadata; step orchestration is defined in `plan.json`.

#### 3.2.2 plan.json

* `plan.json` **MUST** be the single source of truth for:

  * step ordering,
  * scoring mode (`deterministic` vs `judge`),
  * `scorer_ref` (deterministic scorer ID),
  * judge prompt file reference (judge steps),
  * output contract identifier,
  * payload admissions via `inject_payloads`.

* Payload file resolution **MUST** be performed by the Runner using:

  ```
  eus/{eu_id}/{payload_id}.json
  ```

  with only `{eu_id}` placeholder supported and payload IDs matching filenames.

#### 3.2.3 Step Files and response_format

* Step prompt files under `model_steps/` and `judge_prompts/` **MUST** be JSON documents containing at least:

  * `step_id`
  * `messages` array (role/content)
  * `response_format` definition

* `response_format` **MUST** use the simplified schema structure described (not necessarily full JSON Schema), and Runner **MUST** validate model outputs against it.

* **Implementation allowance:** The Runner **MAY** convert the simplified schema into JSON Schema internally.

#### 3.2.4 output_contract

* Each step **MUST** declare an `output_contract` identifier (contract ID) in `plan.json`, and the Runner **MUST** enforce strict validation against the corresponding contract.

**Open decision:** The document set references "output_contract" but does not provide a canonical registry format or location for contract definitions beyond embedding `response_format` in step files.

#### 3.2.5 Judge Prompt Schema and Templating

* Judge prompts **MAY** include `{response}` placeholder; the Runner **MUST** substitute the evaluated model's JSON response as raw text, and **MUST** truncate responses beyond 50,000 characters with a `... [TRUNCATED]` suffix.
* No other placeholders beyond `{response}` are supported.

### 3.3 Required Run Outputs (Canonical Artifacts)

The Runner **MUST** emit at least the following canonical artifacts per run:

* `run.jsonl` (append-only per-step records)
* `audit_log.jsonl` (hashes + delivery proofs)
* `run_manifest.json` (provenance snapshot)
* `summary.json` (deterministic rollups)

**Additional/optional artifacts:**

* `trace.jsonl` **SHOULD** be emitted for LangGraph-shaped events (per the 3-step run prompt).
* Judge results are recorded **inside `run.jsonl`**, nested within the relevant step record. Any references to a separate `judged.jsonl` are legacy/non-canonical for Legal-10.

### 3.4 Ground Truth and Runner-Only Labels

* `ground_truth.json` **MUST** be treated as runner-only and **MUST NEVER** be staged to the evaluated model.
* For citation integrity scoring, build-time **MUST** materialize runner-only inventories in `ground_truth.json` including at least:

  * `anchor_inventory_full`: all unique in-scope citations extracted from anchor text.
  * `rp_subset`: the subset of citations shipped in `p2.json`.

---

## 4. Runner Execution Semantics

### 4.1 Step Lifecycle and Staging (Required)

For each evaluated-model call, the Runner **MUST** implement the staging directory pattern:

1. Create a clean staging directory at `staging/{run_id}/{call_id}/`.
2. Copy **ONLY** the current step prompt file(s) (as specified by `step_file` in `plan.json`) into staging.
3. Copy **ONLY** payloads listed in the step's `inject_payloads` into staging (resolved under `eus/{eu_id}/`).
4. Write `candidate_state.json` into staging (sanitized; no scores/GT/judge outputs).
5. Ensure the evaluated-model adapter reads only from staging.
6. Delete/clean staging after the call finishes.

### 4.2 Payload Admission Semantics

* Payload availability to the evaluated model **MUST** be defined exclusively by `inject_payloads` in `plan.json`.
* The Runner **MUST** treat unadmitted payloads as nonexistent to the evaluated model by ensuring they are not staged.
* For the AG10 baseline direction, the Runner **MUST** enforce that:

  * `p1` (anchor) is available before/at early steps; and
  * `p2` (research pack) becomes admissible only at the open-book boundary step (e.g., last IRAC step).

### 4.3 Message Construction and Prompt Composition

* The Runner **MUST** build the model-call message list from:

  * the step's `messages` in the step file,
  * admitted payload contents (as staged), and
  * sanitized carry-forward state (`candidate_state.json`), per the configured session strategy.

* For the 3-step vertical slice, the Runner **MUST** resend the full anchor text on every step (v1 run behavior).

* For Inspect-style "windowed" prompts, the system message **SHOULD** be constant and each sample input **SHOULD** be structured into fenced windows (ENV, ANCHOR_PACK, EVIDENCE_PACK, CARRY_FORWARD, TASK, OUTPUT_GUARD).

### 4.4 Candidate State Persistence and Sanitization

* The Runner **MUST** maintain a `candidate_state` object whose content is limited to "prior parsed artifacts generated by the model itself" and is sanitized to exclude:

  * ground truth,
  * scoring logic,
  * judge outputs.

* The Runner **MUST** serialize candidate state as `candidate_state.json` and include it (or its content) in each evaluated-model call's staged view.

* The evaluated model **MUST NOT** directly write state; the Runner **MUST** parse model output and update state providers itself, enforcing admissibility rules.

### 4.5 Replay/Context-Window Strategies

The Runner **MUST** support (at minimum) the following session strategies:

* **Replay_Full (full transcript):** maintain a growing message history for the EU; construct each call as `Invariant Header + Full History + Step Prompt`.

* **Replay_Minimal (bounded state):** treat each step as a hard cut/fresh call; construct each call as `Invariant Header + Admitted Payload + CARRY_FORWARD block + Step Prompt`.

* Both strategies **MUST** yield mathematically identical audit-log evidence availability boundaries; differences are only in how history is presented.

### 4.6 Determinism and Reproducibility Requirements

* For sealed snapshots, the Runner **MUST** perform **no runtime retrieval**; model-visible evidence bytes are pre-packaged in EU payload files.
* The Runner **MUST** validate model responses against declared schemas and treat invalid responses as step failures with recorded validation errors.
* The Runner **MUST** append step results to `run.jsonl` immediately after scoring to prevent crash-related data loss.
* Build-time generated artifacts that depend on randomness **MUST** use fixed seeds and record generation provenance.
* Deterministic steps **MUST** be scoreable without runtime database queries by materializing required runner-only data into EU artifacts at build time.
* Any RNG used for synthetic trap generation or similar **MUST** be fixed/recorded to allow identical regeneration and verification.

### 4.7 Bundling Multiple Steps into One Call

* The Runner **MAY** bundle multiple step prompts into one evaluated-model call, while still emitting per-step scoring and `run.jsonl` records per step.

**Open decision:** The document set does not specify how `call_id` maps to multiple bundled `step_id`s in staging and audit logs (e.g., whether multiple step files are staged simultaneously or concatenated).

---

## 5. Datasets & Evidence

### 5.1 Dataset Types and Sources (Required Inventory)

The benchmark's EU builder and scorer **MUST** rely on offline-built datasets/artifacts including (non-exhaustive, but explicitly listed as canonical):

* **Anchor corpus:** `scdb_full_with_text.jsonl` (27,733 SCOTUS cases with full majority opinion text and metadata; includes sealing hashes and Fowler scores).
* **Citation occurrence inventory:** `citation_inventory.parquet` (378,938 citation occurrences; includes offsets, raw/normalized cite, pin cite).
* **Crosswalks:**

  * `scotus_to_scotus_map.parquet/.jsonl` for U.S. citations resolved to SCDB case IDs (323,404 occurrences; 21,505 unique authorities resolved).
  * `scotus_to_cap_map.jsonl` for federal citations resolved to CAP IDs (55,534 occurrences; 43,043 unique authorities; 98.2% match rate).
* **Authority ranking artifacts:**

  * `scotus_citations_ranked.jsonl` (SCOTUS citations pre-ranked by Fowler score; consumed by EU builder; top-K used for RP).
  * `cap_citations_ranked.jsonl` (federal citations pre-ranked by PageRank percentile; K=5 for RP).
* **Authority text bundles:**

  * `casesumm_syllabi.parquet` (SCOTUS case summaries for cited authorities).
  * `cap_head_matter.jsonl` (CAP head_matter for cited authorities).
  * `cap_appellate_text.jsonl`, `cap_trial_text.jsonl` plus download indices.
* **Treatment network:** `shepards_edges` table in `legal10-updates.duckdb` (5,711,699 edges) used for polarity/treatment ground truth in Known Authority.
* **Canary ground truth labels:** `citation_depth_labels.parquet` (DETAILED/PASSING labels for U.S. citations).
* **Hallucination traps:** `fake_cases.csv` and `fake_cap_cases.csv` (deterministic fake citations).

### 5.2 Evidence Packs / Research Packs (Composition)

* The Research Pack (RP) **MUST** be delivered as EU payload `p2.json` and admitted only when scheduled by `inject_payloads`.
* RP content **MUST** include (at minimum) authority entries containing a canonical citation and a text field for the authority (e.g., syllabus/head_matter) and may include authority score fields (e.g., Fowler score).
* RP content is described as a "sealed evidence bundle" intended to include anchor opinion, top-K cited authorities, and selection manifest details.
* Research Packs **SHOULD** be sealed/verifiable and treated as build-time evidence bundles (e.g., SHA-256 hashing and provenance manifests).

**Open decision:** The attached documents are not fully consistent on whether RP must include "citation evidence snippets, signals, and Shepard's treatment data" as part of p2 vs as runner-only GT/supporting artifacts.

### 5.3 Authority Selection Rules and Limits (K-Rule)

* The EU builder **MUST** select SCOTUS authorities for RP as Top-K by Fowler `pauth_score`, with K=10 (or fewer if fewer exist).
* The EU builder **MUST** select CAP/federal authorities for RP as Top-K by PageRank percentile, with K=5 (or fewer if fewer exist).
* Tie-breaking for selection **SHOULD** be deterministic; lexicographic by citation string is explicitly described as deterministic tie-breaking.

**Resolved:** Research Pack selection constants are **SCOTUS K=10** and **CAP K=5**. Any alternative constants (e.g., `TOP_K_CITATIONS = 12`) are non-canonical for Legal-10.

### 5.4 Reporter/Citation Scope and Exclusions

* Deterministic citation integrity checks **MUST** treat the following reporter families as in scope:

  * SCOTUS: `U.S.`
  * Federal: `F.`, `F.2d`, `F.3d`, `F. Supp.`, `F. Supp. 2d`, `F. Supp. 3d`

* Citation integrity scoring **MUST** treat state reporters as out of scope (baseline).

* **Resolved (F.4th):** `F.4th` is **excluded everywhere** (IRAC prompts, scoring, inventories), regardless of any older fact-sheet language.

### 5.5 Provenance, Sealing, Hashing, Verification

* EU payloads and Research Packs **SHOULD** be serialized deterministically and hashed (SHA-256) to detect modification and support audit.
* Anchor corpus entries include sealing metadata fields for reproducibility (file bytes and SHA-256 hashes).
* Synthetic trap files **MUST** be regenerable deterministically and verifiable via hash and manifest.
* **No hidden state:** all managed state provider contents **MUST** be serializable and included in `audit_log.jsonl` for a run to be valid.

**Resolved (anchor handling):** Anchor opinions are **never trimmed**. Any length constraints apply only at **EU selection/build time** (i.e., selecting eligible anchors), not via runtime truncation.

---

## 6. Prompting & Interaction Model

### 6.1 Global Instruction Rules (Information Discipline)

* The evaluated model **MUST** be instructed to use only the information provided in the current sample's user messages / staged files and **MUST NOT** use prior legal knowledge.
* When required information is missing, the evaluated model **MUST** return exactly `INSUFFICIENT_INFO` (or the benchmark-defined exact token).
* The system message **MUST** instruct that the model uses ONLY information in provided messages, does not use prior knowledge, and returns `INSUFFICIENT_INFO` when required information is missing.

**Open decision:** Canary deterministic scoring accepts multiple equivalents ("Insufficient information", "Not provided", etc.), while the Inspect prompt pattern requires exact `INSUFFICIENT_INFO`. This needs normalization policy.

### 6.2 Prompt Windows, Fences, and Session Cuts

* For Inspect-compatible message construction, inputs **SHOULD** be structured as multiple explicit windows with hard BEGIN/END fences, including an explicit carry-forward window when needed.
* The prompting system **SHOULD** use explicit, fenced "context windows" (e.g., Anchor Pack, Evidence Pack, Carry-Forward, Task, Output Guard) so the model's available information is explicit and auditable.
* For chain execution where history is bounded, carry-forward **MUST** contain only prior model output (never ground truth), and **MUST** be explicitly included when intended.

### 6.3 Output Formatting Requirements

* Each step **MUST** declare a machine-parseable response format (JSON schema-like structure) and the evaluated model **MUST** output exactly the contract (no extra text).
* IRAC steps **MUST** include an explicit citation list field in the returned IRAC JSON (in addition to inline citations), as required by the citation integrity scoring.
* Known Authority step output **MUST** use a strict JSON key set (at minimum: `controlling_authority`, `in_favor`, `against`, `most_frequent`).

### 6.4 Citation Formatting and Canonicalization

* Deterministic scoring components **MUST** define normalization policies for pin cites, nominative reporters, and deduplication when comparing citations.

**Open decision:** The normalization/canonicalization policy is requested but not fully specified across documents; must be frozen per step type.

---

## 7. Evaluation Protocol & Step Taxonomy

### 7.1 Canonical Naming and Step Typing

* Step IDs **MUST** use prefixes:

  * `d*` for deterministic scoring steps
  * `j*` for judge-required steps

* Question bank numbering **MAY** use major/minor template IDs (e.g., 1.x, 2.x), but plan execution is governed by `plan.json` step IDs.
* Steps **MUST** be marked as `deterministic` or `judge` in `plan.json`.
* Deterministic steps **MUST** use `scorer_ref` and compare outputs against runner-only ground truth.
* Judge steps **MUST** reference a judge prompt file and use an isolated judge adapter.

### 7.2 Chain Position Constraints

The runspec exporter/runner **MUST** enforce the following ordering constraints:

* Citation integrity must run **after the final drafted output(s)** (end-of-chain verification).
* IRAC without RP **MUST** occur immediately before IRAC with RP.
* Known Authority is "designed to be presented first" when used in-chain (current policy).

### 7.3 AG10 Baseline Chain (Planned Direction)

* The baseline AG10 chain **SHOULD** be treated as:

  * `d1` Known Authority
  * `d2`–`d8` TBD
  * `j9` IRAC without RP (closed-book; judge-scored)
  * `j10` IRAC with RP (open-book; admits `p2`)

* `j9` and `j10` **MUST** be consecutive at the end of the chain; `j10` is the open-book boundary.

**Resolved (older illustrative schedule):**

* `benchmark-structure-v2.md` includes examples with `j7` (legacy; non-canonical) and a final `d8` "Citation Integrity Check" as a model step; `TECHNICAL_FACT_SHEET.md` notes those are older illustrative examples and that Legal-10 uses `j9` + `j10` at the end (both judge-scored).

### 7.4 3-Step Vertical Slice (HAL-Compatible Run Spec)

A minimal "3-STEP-RUN" **MUST** consist of:

* `d1` Known Authority (deterministic scored)
* `d2` IRAC without RP (candidate output)
* `j3` IRAC with RP (candidate output; `p2` admitted)
* After `j3`, a judge call grades both IRACs and a deterministic citation integrity check runs post-hoc.

### 7.5 Step Families and What Each Tests (Taxonomy)

The benchmark includes (at least) the following step families as defined in the question bank taxonomy:

* **Known Authority (KA-SC, KA-CAP):** selection/ranking/classification over the anchor's citation universe; deterministic GT based on Fowler score, Shepard's treatment polarity, and citation frequency.
* **Canary:** information discipline test: answer "insufficient information" when asked about PASSING citations (no text provided).
* **Citation Integrity:** deterministic verification of citations used in IRAC outputs against runner-only inventories (anchor inventory + RP subset).
* **IRAC Without RP / IRAC With RP:** judge-scored IRAC drafting; same rubric grades both IRACs; requires explicit citation list field.
* **Transitive Authority:** multi-hop reasoning over citation chain A→B→C; predict treatment propagation.
* **Unknown Authority / Validate Authority / Distinguish / Fact Extraction / Oyez:** present in taxonomy/legacy, but some are placeholders or not baseline-specified in this attachment set.

### 7.6 "Fully Developed Question" Readiness Gate

* A question template **MUST** be treated as "Fully Developed" only if it specifies: deterministic instantiation inputs and eligibility, closed response contract, and deterministic scoring or complete judge rubric/aggregation.
* If a signal is used for scoring (authority score, treatment label, frequency, etc.), the template **MUST** specify how that signal becomes model-visible (feature cards/excerpts/answer sheets) or explicitly declare a prior-only prediction task.
* Each question/step definition **SHOULD** satisfy the "Fully Developed Question" contract: question ID, prompt template, data requirements/joins, eligibility criteria, instantiation query, closed response contract, and scoring specification.

---

## 8. Scoring, Integrity Checks, and Safety Design

### 8.1 Scoring Modes

* Steps **MUST** be either:

  * **deterministic-scored** (runner computes score against ground truth), or
  * **judge-scored** (runner calls judge model using rubric prompt).

* The Runner **MUST** score after every step and record step results immediately to `run.jsonl`.
* `run.jsonl` **MUST** contain per-call/per-step records including at least run_id, call_id, step_id, payloads, raw_output, parsed output, score, and scoring_details.

### 8.2 Deterministic Scoring: Examples and Requirements

* Deterministic scoring components **MUST** be reproducible given identical inputs; no LLM calls.
* Deterministic scoring **SHOULD** record constants and version changes in manifests for audit.

### 8.3 Judge Scoring for IRAC

* The judge model **MUST** be prompted with a rubric that grades both IRAC outputs (closed-book and open-book) using an MEE-style rubric (as stated).

### 8.4 Citation Integrity: Deterministic Verification

The benchmark includes at least one deterministic citation integrity mechanism:

**A) Inventory-based integrity (admissibility discipline)**

* The Runner **MUST** extract model-used citations from the explicit citation list field in each IRAC JSON output.
* The Runner **MUST** compute:

  * Anchor-inventory validity for both IRACs (citation must exist in anchor inventory full list).
  * RP-subset usage for open-book IRAC only (citation must exist in RP subset).
* The step output **MUST** include the specified output fields (citations used, inventories, counts, out_of_scope, errors).

**B) Authenticity/fabrication gate (existence discipline)**

* The safety design doc specifies a deterministic Citation Integrity Check that verifies extracted citations against SCDB and synthetic traps; citation passes only if it exists in SCDB and is not in the trap set.

**Resolved:** Legal-10 requires **both** (A) inventory-based admissibility checks and (B) authenticity/fabrication gate checks. The synthetic trap pool is **50,000**, with **2 traps injected per EU**.

### 8.5 Canary Mechanism (Information Discipline)

* Each EU **MUST** distinguish between:

  * **DETAILED citations:** full text provided in RP
  * **PASSING citations:** only mentioned by name (no text given)

* Canary questions **MUST** ask for details about PASSING citations such that the correct answer is "insufficient information".
* Canary scoring **MUST** deterministically treat substantive answers about PASSING citations as failure.
* Build time **MUST** assign each citation a depth label using the defined hybrid system (syllabus check; string cite structural detection; TF-IDF similarity threshold 0.15).
* Scoring rubric **MUST** reward "Insufficient information…" for PASSING citations and penalize detailed claims for PASSING citations.

**Open decision:** classification logic for "Ambiguous/hedged" responses is TBD and must be specified (keyword/regex/classifier).

### 8.6 Citation Integrity Enforcement (Policy)

* Citation integrity failures (fabricated, non-existent, or disallowed citations) are handled via deterministic verification and scoring-side penalties recorded in `scoring_details`.
* The evaluation proceeds to completion; integrity checks do not terminate the chain or suppress later steps.
* Citation integrity enforcement is penalty-based: fabricated or non-existent citations trigger an integrity failure recorded in scoring details and reflected in scoring.

### 8.7 Chain Consistency Checks and Graceful Degradation

* The system **SHOULD** implement chain consistency checks (CC1–CC5) to detect contradictions between step outputs (e.g., different controlling authority in early steps vs synthesis).
* The system **SHOULD** support graceful degradation by explicitly marking steps as skipped due to dependency or coverage failures (e.g., `SKIPPED_DEPENDENCY`, `SKIPPED_COVERAGE`).

### 8.8 Failure Modes and Invalid Output

* If the evaluated model output fails schema validation, the Runner **MUST** record the validation error and mark the step as failed/invalid for scoring purposes.
* Steps **SHOULD** record explicit skip statuses when prerequisites or coverage are missing (dependency gate / coverage gate).

**Open decision:** The concrete status enum values for `run.jsonl` (e.g., OK/FAILED/SKIPPED_*) are not specified in the provided plan/run schema examples and must be frozen.

---

## 9. Compliance, Auditability, and Logging

### 9.1 What Gets Logged and Why

The Runner **MUST** log sufficient information to prove:

* what evidence bytes were available at each step (delivery boundaries),
* what messages were sent to the evaluated model,
* what outputs were received and how they were parsed,
* what scoring was applied and with which inputs.

### 9.2 Canonical Artifacts (Required)

A run **MUST** emit:

* `run.jsonl`: step results (append-only). Per-step/per-call records including identifiers, payload admissions, raw output, parsed output, and scoring details.
* `audit_log.jsonl`: delivery proofs/hashes that bind staged bytes + message bytes to each call/step.
* `run_manifest.json`: provenance snapshot (model versions, config). Snapshot provenance, including model IDs/settings and hashes of inputs.
* `summary.json`: deterministic rollups / composite score output computed from `run.jsonl`.

### 9.3 Provable Run Criteria

A run **MUST** be considered "provable" only if:

* staging isolation was enforced (tests exist that ground truth/judge prompts/future steps were never staged),
* candidate state was sanitized (no scores/GT/judge outputs),
* all provider content used for statefulness is serializable and included in audit artifacts.

### 9.4 Re-Run Reproducibility Expectations

* Re-running the same benchmark packet + EU packet **MUST** reproduce:

  * identical admissions timing (plan-driven),
  * identical deterministic scoring outputs,
  * identical audit hashes for staged bytes/messages when using identical model settings and deterministic serialization.

* Deterministic scorers **MUST** be frozen/versioned such that identical inputs yield identical deterministic outputs.
* Session strategies (Replay_Full vs Replay_Minimal) **MUST NOT** change what evidence is recorded as available in the audit log.

---

## 10. Implementation Notes & Constraints

### 10.1 Chain2 Export Architecture (Runner Consumes Exported Packets)

* The runner **SHOULD** consume only exported benchmark/EU packets; step definitions live in a runspec-agnostic step library (`chain2/`) and are assembled at export time.
* Each step package in `chain2/` **MUST** include `manifest.json`, prompt template, output contract, and deterministic scoring script/tests.

### 10.2 Integration Constraints: Inspect

* refer to 

### 10.3 Physical Separation Problem (Inspect Wrapper Risk)

* Legal-10 strict mode requires payloads loaded one-at-a-time from disk with file-boundary evidence; Inspect loads sample data into memory at task start, potentially exposing ground truth via `metadata`. Therefore, the recommended approach is to **borrow Inspect patterns but keep the Legal-10 runner** for invariants.
* Inspect AI loads everything up front; this conflicts with Legal-10's need for physical separation and timed payload admission. A Legal-10 implementation **MUST NOT** use a design where the evaluated model can access unadmitted materials at runtime.
* A viable approach is to borrow Inspect's solver/registry/logging patterns while keeping the Legal-10 runner responsible for staging and admissions ("Option B with C").

### 10.4 Implementation Status Constraints (Repo Reality)

* In the referenced repo state, `chainexecutor/` exists but is empty; legacy step/scoring code exists under `chain/` and `_legacy/`. Therefore, an implementation **MUST** either (a) build the ChainExecutor per spec or (b) port semantics into the legacy runner.

### 10.5 Performance/Context Assumptions

* Anchor text length constraints are an active design consideration; selection may prefer anchors with `opinion_chars <= 15k` (fallback up to 20–25k). This constraint impacts template coverage and whether truncation is allowed.

### 10.6 Versioning and Change Control

* Benchmark packets **MUST** include a `version` in `benchmark.json`, and changes to scoring constants **SHOULD** require version bumps recorded in run manifests.

### 10.7 Known Limitations / Near-Term Constraints

* Many mid-chain steps (`d2–d8`) are not yet frozen; runspec export must enforce hard constraints (e.g., known_authority first, IRAC ordering, citation integrity last).
* Anchor text budget and truncation policy directly impacts ground-truth correctness for frequency/offset labels and must be decided before finalizing pack composition.

---

## C) Appendix: Open Decisions / Unknowns / TODOs

This appendix lists items explicitly ambiguous, missing, or conflicting across the provided documents.

### C.1 Resolved Items

1. **Synthetic trap set size.** **Resolved:** a global pool of **50,000** synthetic citations, with **2 injected per EU** (deterministically). (Safety-design references to 2,000 or file counts of 1,000+1,000 are treated as implementation artifacts/legacy snapshots, not the canonical pool size.)

2. **Top-K selection rule constants.** **Resolved:** SCOTUS K=10; CAP K=5. (`TOP_K_CITATIONS=12` is non-canonical.)

3. **Reporter scope mismatch.** **Resolved:** `F.4th` is **excluded everywhere** (prompts, scoring, inventories).

4. **Judge logging artifact.** **Resolved:** Judge records live inside `run.jsonl` (nested in the step record). No separate `judged.jsonl` artifact exists in Legal-10.

5. **Step schedule naming.** **Resolved:** Legal-10 end steps are `j9` and `j10` (both judge-scored). Illustrative `j7`/`d8` examples are legacy/non-canonical.

6. **Citation integrity enforcement model.** Integrity failures are recorded as penalties and audit signals; the evaluation proceeds to completion.

7. **Citation integrity definition scope.** Both inventory-based admissibility checks and authenticity gate vs SCDB + trap set are required.

### C.2 Open Decisions Required to Finalize Implementation

8. **Anchor text budget policy:** filter-only vs runtime truncation (and required GT rebuild if truncating).

9. **Known Authority citation scope:** SCOTUS-only vs SCOTUS+federal; pin cite normalization; deduplication policy; tie-break rules.

10. **Ground truth mapping for Known Authority:**

   * Tie-break rules for Fowler ties/missing scores.
   * Shepard's label→polarity mapping enumeration (positive/negative/neutral).

11. **KA-CAP polarity enablement:** currently deferred due to missing artifact/bridge.

12. **Canary classification logic:** how to score "ambiguous/hedged" refusals.

13. **RP composition beyond authority texts:** whether RP must include treatment/snippets/selection manifest as candidate-visible vs runner-only.

14. **Output contract registry:** where `output_contract` definitions live and how they relate to `response_format` in step files.

15. **Finalize AG10 mid-chain step definitions (`d2–d8`)** including prompt files, output contracts, scorers, and coverage predicates.

16. **Freeze D1 anchor text budget policy (filter vs truncate).**

17. **Freeze D2 pack count behavior (fixed-size backfill vs variable-size).**

18. **Define the composite score aggregation** that produces `summary.json` (currently referenced but not specified).

19. **Finalize canary depth label schema and ensure dedicated step/spec docs exist** (dataset notes indicate documentation gaps).

20. **Normalization/canonicalization policy** for citations must be frozen per step type.

21. **Concrete status enum values** for `run.jsonl` (e.g., OK/FAILED/SKIPPED_*) must be specified.

### C.3 Documentation Gaps (Explicitly Noted)

* A canonical spec MD for `citation_depth_labels.parquet` is described as missing/high priority.
* `distinguish.md` and `fact_extraction.md` are placeholders (spec pending).

---

## D) Glossary + Acronyms

* **AG10**: Baseline 10-step chain configuration referenced as canonical baseline direction.
* **Audit log (`audit_log.jsonl`)**: Append-only log containing hashes/delivery proofs of staged bytes and messages.
* **Benchmark packet**: Shared package containing `benchmark.json`, `plan.json`, `model_steps/`, and `judge_prompts/`.
* **CAP**: Caselaw Access Project; used for federal (non-SCOTUS) authorities and head_matter extraction.
* **CandidateState / `candidate_state.json`**: Runner-maintained, sanitized carry-forward state containing only prior model-derived artifacts; excludes GT/scores/judge outputs.
* **ChainExecutor / Runner**: Orchestrator that loads sealed EU + benchmark plan, stages admitted files, calls models, scores steps, and writes artifacts.
* **DETAILED / PASSING**: Canary depth labels describing whether a citation contains enough anchor-discussion to justify detailed claims; DETAILED means full text provided; PASSING means citation referenced without providing text. Used to score information discipline.
* **EU (Evaluation Unit)**: Sealed on-disk packet per anchor instance containing `p1`, `p2`, and runner-only `ground_truth`.
* **Fowler score / pauth_score**: Authority ranking metric used to rank SCOTUS authorities for K-rule selection.
* **HAL**: Harness/runner framework whose default mode is one task → one agent invocation; Legal-10 requires a plan-driven multi-step runner inside that environment to achieve strict semantics.
* **Inspect AI**: Evaluation framework with Plan/Solver abstractions; useful patterns for logs/messages but may violate strict file-level separation by loading all sample data into memory.
* **IRAC**: Issue–Rule–Application–Conclusion structured legal analysis used as judge-scored synthesis tasks (with/without RP).
* **JSONL**: JSON Lines (one JSON object per line) used for `run.jsonl` and `audit_log.jsonl`.
* **K-rule**: Deterministic selection rule for RP authorities: SCOTUS K=10 by Fowler; CAP K=5 by PageRank percentile.
* **Legal-10**: Chained evaluation plan with 10 positions: `d1–d8` deterministic, then `j9` and `j10` judge-scored IRAC steps, with a final deterministic citation integrity check applied after the IRAC outputs.
* **Plan (`plan.json`)**: Orchestration manifest/contract defining step order, payload injections, scoring modes, scorer_ref/judge_prompt_file, and output contracts.
* **RP (Research Pack) / `p2.json`**: Sealed evidence payload admitted at open-book boundary; contains authority texts and (optionally) metadata/signals. Built at export time with Top-K selection.
* **SCDB**: Supreme Court Database; canonical source of SCOTUS cases and (in this system) a verification universe for citation integrity.
* **SCOTUS**: Supreme Court of the United States; anchor corpus and primary authority universe.
* **Shepard's / shepards_edges**: Citation treatment network used for polarity/treatment ground truth (e.g., follows, distinguishes, overrules).
* **Staging directory**: Per-call temporary directory containing only the step file(s), admitted payloads, and candidate_state to enforce no-leak. Pattern: `staging/{run_id}/{call_id}/`.
* **Structural no-leak / staging directory pattern**: Per-step physical isolation where only current step + admitted payloads + sanitized state are visible to the evaluated model adapter.
