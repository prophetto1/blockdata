# Botpress and Kestra Architecture Audit Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify the factual accuracy and completeness of `docs/botpress-architecture-report.md` and `docs/botpress-vs-kestra-architecture.md` against the actual Botpress and Kestra source repos, then revise the documents to match the code.

**Architecture:** Work in three passes. First, decompose both documents into concrete claims that can be checked. Second, verify those claims against the source repos by tracing discovery, composition, runtime execution, transport, and component inventories. Third, revise the docs with source-backed corrections, note any remaining inference, and add explicit evidence paths for future re-checks.

**Tech Stack:** Markdown, ripgrep, git, TypeScript/Node monorepo inspection, Java/Gradle monorepo inspection

**Primary sources:**
- `/home/jon/BD2/external/botpress`
- `/home/jon/kestra-repos/kestra`
- `/home/jon/kestra-repos/kestra.io`
- `/home/jon/BD2/docs/botpress-architecture-report.md`
- `/home/jon/BD2/docs/botpress-vs-kestra-architecture.md`

---

### Task 1: Freeze the Current Claims

**Files:**
- Read: `docs/botpress-architecture-report.md`
- Read: `docs/botpress-vs-kestra-architecture.md`
- Create: `docs/plans/tmp/botpress-kestra-claim-checklist.md`

**Step 1: Extract claim buckets**

Create a checklist grouped by:
- component inventories and counts
- dependency and discovery model
- plugin and interface contracts
- composition and wiring
- runtime execution flow
- routing and transport
- persistence and state management
- external repo / BD2 translation status

**Step 2: Mark claim types**

For each claim, mark one of:
- `DIRECT` — should be provable by source code
- `DERIVED` — inference from multiple source files
- `ESTIMATE` — count or maturity statement that may need recomputation

**Step 3: Record doc locations**

For every claim, capture:
- source document path
- heading
- line number or nearest heading
- short paraphrase of the claim

**Step 4: Save the checklist**

Save the checklist in `docs/plans/tmp/botpress-kestra-claim-checklist.md`.

---

### Task 2: Verify Botpress Structure and Counts

**Files:**
- Read: `/home/jon/BD2/external/botpress/pnpm-workspace.yaml`
- Read: `/home/jon/BD2/external/botpress/package.json`
- Read: `/home/jon/BD2/external/botpress/interfaces/**`
- Read: `/home/jon/BD2/external/botpress/integrations/**`
- Read: `/home/jon/BD2/external/botpress/plugins/**`
- Read: `/home/jon/BD2/external/botpress/bots/**`
- Read: `/home/jon/BD2/external/botpress/packages/**`
- Read: `/home/jon/BD2/external/botpress/scripts/**`

**Step 1: Recompute component counts**

Run exact inventory commands for:
- packages
- interfaces
- integrations
- plugins
- bots
- scripts

Record both the raw count and the inclusion rule used to get it.

**Step 2: Validate the Botpress type model**

Trace the definition files and runtime files for:
- `InterfaceDefinition`
- `IntegrationDefinition`
- `PluginDefinition`
- `BotDefinition`

Confirm whether the document language about contracts, `.extend()`, `interfaces`, and `addPlugin(...dependencies...)` matches the code.

**Step 3: Validate discovery/build claims**

Verify:
- workspace discovery via `pnpm-workspace.yaml`
- build orchestration via Turbo / CLI
- generation of `.botpress/`
- whether there is or is not a central runtime registry

**Step 4: Validate runtime call flow**

Trace one real interface-driven path end to end:
- plugin hook calls an abstract interface action
- bot wiring resolves the dependency
- client/platform call routes to the integration
- integration runtime implements the action

Prefer a concrete example such as `knowledge` + `openai` if still present in the repo; if not, pick the closest current example and update the document accordingly.

---

### Task 3: Verify Kestra Core and Plugin Architecture

**Files:**
- Read: `/home/jon/kestra-repos/kestra/settings.gradle`
- Read: `/home/jon/kestra-repos/kestra/build.gradle`
- Read: `/home/jon/kestra-repos/kestra/core/**`
- Read: `/home/jon/kestra-repos/kestra/model/**`
- Read: `/home/jon/kestra-repos/kestra/executor/**`
- Read: `/home/jon/kestra-repos/kestra/worker/**`
- Read: `/home/jon/kestra-repos/kestra/scheduler/**`
- Read: `/home/jon/kestra-repos/kestra/storage-local/**`
- Read: `/home/jon/kestra-repos/kestra.io/src/**`

**Step 1: Recompute module and category counts**

Verify the module-level inventory and determine whether the docs should say:
- exact count
- approximate count
- named modules only

Recompute registered plugin categories from source, not from memory.

**Step 2: Validate plugin taxonomy**

Trace the source for:
- `RunnableTask`
- `FlowableTask`
- `ExecutableTask`
- trigger interfaces
- condition types
- task runners
- storage and secret extension points

Confirm whether the current comparison collapses the architecture correctly or overstates similarity.

**Step 3: Validate discovery and registry claims**

Check:
- `@Plugin` usage
- annotation processing or metadata generation
- `ServiceLoader` use
- plugin registry classes and lookup path

Document the exact classes that implement discovery and registration.

**Step 4: Validate execution and routing**

Trace:
- execution creation
- task run state transitions
- executor-to-worker handoff
- worker result return path
- queue abstraction and supported backends

Separate what is directly in `kestra` from what is only described in `kestra.io`.

---

### Task 4: Verify the Comparison Layer

**Files:**
- Read: `docs/botpress-vs-kestra-architecture.md`
- Read: evidence gathered from Tasks 2 and 3

**Step 1: Audit side-by-side mappings**

Check whether these pairings hold under source review:
- package ↔ core module
- integration ↔ runnable task
- plugin ↔ flowable task
- bot ↔ flow

For each pairing, label it:
- `STRONG ANALOGY`
- `WEAK ANALOGY`
- `MISLEADING`

**Step 2: Audit the five-stage comparison**

Verify each stage claim:
- discovery
- composition
- resolution
- execution
- routing

Do not preserve a “same architecture” conclusion unless the source evidence supports it after the deeper read.

**Step 3: Audit language for overreach**

Flag statements that sound stronger than the evidence, especially:
- “same architecture”
- exact component counts
- “no equivalent”
- maturity percentages
- transport or persistence claims not tied to code

---

### Task 5: Verify the BD2 Translation Status Section

**Files:**
- Read: `docs/botpress-vs-kestra-architecture.md`
- Read: `integrations/.registry.json`
- Read: `kt/**`
- Read: `engine/**`
- Read: relevant plans in `docs/plans/`

**Step 1: Recompute translation counts**

Verify the numbers in the BD2 status section:
- total files
- plugin package count
- translated class count
- `NotImplementedError` count

Do not keep approximate percentages unless you can explain the method used to estimate them.

**Step 2: Separate structure from functionality**

Validate the current claims about:
- structure completeness
- implementation completeness
- executor / worker / scheduler readiness
- external integration readiness

If the current wording is too confident, downgrade it.

---

### Task 6: Revise the Documents

**Files:**
- Modify: `docs/botpress-architecture-report.md`
- Modify: `docs/botpress-vs-kestra-architecture.md`

**Step 1: Correct factual errors**

Update counts, terminology, examples, and class names that do not match the current repos.

**Step 2: Tighten the analytical claims**

Keep the comparison useful, but separate:
- direct source facts
- evidence-based inference
- opinionated interpretation

**Step 3: Add durable evidence hooks**

Where useful, add short “Source anchors” bullets naming the repo paths or classes that justify the section. Do not add noisy inline citations everywhere.

**Step 4: Final verification**

Run:
```bash
rg -n "TODO|FIXME|TBD|placeholder" docs/botpress-architecture-report.md docs/botpress-vs-kestra-architecture.md
```

Expected:
- no unresolved placeholders left in the two docs

---

### Task 7: Produce an Audit Summary

**Files:**
- Create: `docs/botpress-kestra-audit-summary.md`

**Step 1: Summarize findings**

Capture:
- what was correct
- what changed
- what remains inferred
- what should be rechecked after upstream repo changes

**Step 2: Include exact source roots**

List the repos and the key source directories used for the audit so the next pass can repeat the work quickly.
