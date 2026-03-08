# Proposals Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current local-first proposals workspace into a maintainable, role-ready editorial workflow with structured APIs, safer file writes, and a cleaner UI architecture.

**Architecture:** Keep proposal files in `src/content/docs/proposals/` and keep frontmatter as the workflow source of truth, but move parsing, validation, list loading, and writes into a reusable proposal repository layer. Refactor the giant inline Astro page into focused UI components and switch review actions to structured request/response flows that can later swap from local filesystem writes to GitHub or another backend without rewriting the workspace.

**Tech Stack:** Astro, Starlight, TypeScript/ESM modules, local filesystem APIs, Node test scripts, HTML dialog or small client island where interaction gets too stateful.

---

## Phase 2 Scope

Phase 2 should not try to solve production Git-backed multi-user approvals yet. It should solve the next real problems in V1:

- the workspace is mostly one large Astro file
- proposal reads and writes are not abstracted
- reviewer identity is a free text field
- API responses are redirect-only and UI error handling is thin
- there is no optimistic conflict check before overwriting a file
- accepted proposals are not surfaced as a canonical output lane beyond the same table

Success for Phase 2 means:

- proposal data loading and writes are centralized
- the UI is componentized and easier to evolve
- review actions are validated and safer
- the workspace is ready for a future GitHub or auth-backed Phase 3

---

### Task 1: Lock the Phase 2 Domain Contract

**Files:**
- Create: `src/lib/proposals/types.ts`
- Modify: `src/lib/proposals/workflow.mjs`
- Test: `scripts/proposals-repository.test.mjs`

**Step 1: Write the failing test**

Create `scripts/proposals-repository.test.mjs` with assertions for:
- `parseProposalDocument()` returning structured metadata plus body
- `validateProposalStatusTransition()` allowing `draft -> submitted`
- `validateProposalStatusTransition()` allowing `submitted -> conditional-accept|accepted|rejected`
- `validateProposalStatusTransition()` rejecting invalid jumps like `draft -> accepted`

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-repository.test.mjs`

Expected: FAIL because `types.ts` and the new validation helpers do not exist yet.

**Step 3: Write minimal implementation**

Create `src/lib/proposals/types.ts` with:
- `ProposalStatus`
- `ProposalFrontmatter`
- `ProposalSummary`
- `ProposalReviewInput`

Add to `src/lib/proposals/workflow.mjs`:
- `parseProposalDocument()`
- `validateProposalStatusTransition()`
- `canAppendAssessment()`

Do not change UI yet. Keep this task purely domain-level.

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-repository.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/proposals/types.ts src/lib/proposals/workflow.mjs scripts/proposals-repository.test.mjs
git commit -m "refactor: define proposal workflow domain contract"
```

---

### Task 2: Extract a Proposal Repository Layer

**Files:**
- Create: `src/lib/proposals/repository.mjs`
- Modify: `scripts/normalize-proposals.mjs`
- Modify: `src/pages/api/proposals/review.ts`
- Test: `scripts/proposals-repository.test.mjs`

**Step 1: Write the failing test**

Extend `scripts/proposals-repository.test.mjs` with repository-level assertions for:
- `listProposals()` returns normalized summaries sorted by `updatedAt`
- `readProposal(filename)` returns metadata plus markdown body
- `writeProposalReview()` updates status, review fields, and appends assessment text
- `writeProposalReview()` throws on invalid transition

Use a fixture directory under `scripts/fixtures/proposals/` or a temporary directory created during the test.

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-repository.test.mjs`

Expected: FAIL because repository functions do not exist yet.

**Step 3: Write minimal implementation**

Create `src/lib/proposals/repository.mjs` with:
- `listProposals({ rootDir })`
- `readProposal({ rootDir, filename })`
- `normalizeProposalFile({ rootDir, filename })`
- `writeProposalReview({ rootDir, filename, reviewer, status, note, expectedUpdatedAt })`

Update `scripts/normalize-proposals.mjs` to call repository helpers instead of duplicating file traversal logic.

Update `src/pages/api/proposals/review.ts` to depend on the repository layer rather than direct `readFile`/`writeFile`.

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-repository.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/proposals/repository.mjs src/pages/api/proposals/review.ts scripts/normalize-proposals.mjs scripts/proposals-repository.test.mjs
git commit -m "refactor: add proposal repository layer"
```

---

### Task 3: Add Structured API Responses and Conflict Checks

**Files:**
- Create: `src/pages/api/proposals/list.json.ts`
- Create: `src/pages/api/proposals/[filename].json.ts`
- Modify: `src/pages/api/proposals/review.ts`
- Test: `scripts/proposals-api.test.mjs`

**Step 1: Write the failing test**

Create `scripts/proposals-api.test.mjs` with assertions for:
- list endpoint response shape
- single proposal endpoint response shape
- review endpoint returning JSON for `application/json`
- review endpoint rejecting stale writes when `expectedUpdatedAt` does not match the file

If direct route execution is awkward in the test, test the route handlers as imported functions or extract a small service function the handlers call.

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-api.test.mjs`

Expected: FAIL because the JSON endpoints and conflict handling do not exist yet.

**Step 3: Write minimal implementation**

Add:
- `GET /api/proposals/list.json`
- `GET /api/proposals/[filename].json`
- dual-mode `POST /api/proposals/review`:
  - form post keeps redirect behavior
  - JSON post returns `{ ok, proposal, error }`

Add conflict protection:
- include `expectedUpdatedAt`
- reject writes with `409` when the file changed since the client loaded it

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-api.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/api/proposals/list.json.ts src/pages/api/proposals/[filename].json.ts src/pages/api/proposals/review.ts scripts/proposals-api.test.mjs
git commit -m "feat: add structured proposal api and conflict checks"
```

---

### Task 4: Refactor the Workspace UI into Components

**Files:**
- Create: `src/components/proposals/ProposalWorkspace.astro`
- Create: `src/components/proposals/ProposalLanes.astro`
- Create: `src/components/proposals/ProposalTable.astro`
- Create: `src/components/proposals/ProposalAssessDialog.astro`
- Modify: `src/pages/proposals/index.astro`
- Test: `scripts/proposals-workflow.test.mjs`

**Step 1: Write the failing test**

Extend `scripts/proposals-workflow.test.mjs` with assertions that:
- the route imports `ProposalWorkspace`
- lane labels still exist
- the workspace exposes search/filter affordances
- the dialog still contains decision actions

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-workflow.test.mjs`

Expected: FAIL because the components do not exist yet.

**Step 3: Write minimal implementation**

Refactor `src/pages/proposals/index.astro` so it becomes a thin page that:
- loads data
- passes it into `ProposalWorkspace`

Split UI concerns:
- `ProposalLanes.astro` for left nav and counts
- `ProposalTable.astro` for rows and search/filter shell
- `ProposalAssessDialog.astro` for the read/review modal

Add at least:
- client-side text filter by title/description/file name
- empty state for no search matches
- visible error/success message areas for failed or successful reviews

Do not introduce heavy new styling systems. Keep the current visual direction.

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-workflow.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/proposals src/pages/proposals/index.astro scripts/proposals-workflow.test.mjs
git commit -m "refactor: componentize proposals workspace"
```

---

### Task 5: Add a Role-Ready Reviewer Identity Seam

**Files:**
- Create: `src/lib/proposals/session.mjs`
- Modify: `src/pages/proposals/index.astro`
- Modify: `src/pages/api/proposals/review.ts`
- Test: `scripts/proposals-session.test.mjs`

**Step 1: Write the failing test**

Create `scripts/proposals-session.test.mjs` with assertions for:
- `getProposalSession()` returning a dev reviewer identity from env
- anonymous mode disabling review actions
- reviewer name being injected into the form automatically when available

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-session.test.mjs`

Expected: FAIL because session handling does not exist yet.

**Step 3: Write minimal implementation**

Create `src/lib/proposals/session.mjs` with a simple Phase 2 seam:
- read `PROPOSALS_REVIEWER`
- optionally read a request header or cookie later
- expose `canReview`, `reviewerName`, and `mode`

Update the page so:
- reviewer input pre-fills when available
- review buttons disable when no reviewer is present
- anonymous users can still browse proposals

Update the API route so:
- explicit reviewer field is still accepted for dev
- session reviewer overrides the text field when present

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-session.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/proposals/session.mjs src/pages/proposals/index.astro src/pages/api/proposals/review.ts scripts/proposals-session.test.mjs
git commit -m "feat: add proposal reviewer session seam"
```

---

### Task 6: Surface Accepted Proposals as Canonical Output

**Files:**
- Create: `src/pages/proposals/accepted.astro`
- Create: `src/components/proposals/AcceptedProposalList.astro`
- Modify: `src/pages/proposals/index.astro`
- Modify: `src/components/DocsHeader.astro`
- Test: `scripts/proposals-workflow.test.mjs`

**Step 1: Write the failing test**

Extend `scripts/proposals-workflow.test.mjs` with assertions for:
- `/proposals/accepted` route existence
- a header or workspace link to the accepted view
- accepted proposals being presented as canonical decisions rather than only as a table lane

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-workflow.test.mjs`

Expected: FAIL because the accepted route and view do not exist yet.

**Step 3: Write minimal implementation**

Add an accepted-only route that:
- reads the same proposal repository
- filters to `accepted`
- presents clean decision cards or rows
- is suitable for later linking from standards or governance docs

Add links from:
- the proposals workspace
- optionally the docs header if the UX feels right

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-workflow.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/proposals/accepted.astro src/components/proposals/AcceptedProposalList.astro src/pages/proposals/index.astro src/components/DocsHeader.astro scripts/proposals-workflow.test.mjs
git commit -m "feat: add accepted proposals canonical view"
```

---

### Task 7: Expand Verification and Operator Documentation

**Files:**
- Create: `src/content/docs/internal/proposals-workspace.md`
- Modify: `package.json`
- Test: `npm run test:proposals`

**Step 1: Write the failing test**

Extend `scripts/proposals-workflow.test.mjs` with assertions for:
- `normalize:proposals` still exists in `package.json`
- docs mention the proposals workspace route
- docs explain local write restrictions and reviewer env usage

**Step 2: Run test to verify it fails**

Run: `node scripts/proposals-workflow.test.mjs`

Expected: FAIL because the docs do not yet describe Phase 2 operator behavior.

**Step 3: Write minimal implementation**

Document:
- where the workspace lives
- how proposal metadata is normalized
- how to enable writes outside dev
- how to set `PROPOSALS_REVIEWER`
- what conflict errors mean

Add a convenience script only if it reduces friction, for example:
- `"verify:proposals": "npm run test:proposals && npm run check"`

**Step 4: Run test to verify it passes**

Run: `node scripts/proposals-workflow.test.mjs`

Expected: PASS

**Step 5: Run full verification**

Run:

```bash
npm run test:proposals
npm run check
npm run build
```

Expected:
- proposal tests pass
- Astro diagnostics show 0 errors
- build succeeds

**Step 6: Commit**

```bash
git add src/content/docs/internal/proposals-workspace.md package.json scripts/proposals-workflow.test.mjs
git commit -m "docs: add phase 2 proposals operator guidance"
```

---

## Backend Notes for Phase 2

Phase 2 should still stay local-first, but it needs a cleaner seam for later backend upgrades.

Do now:
- isolate filesystem writes behind `repository.mjs`
- add explicit conflict detection
- add structured API responses
- add a session seam for reviewer identity

Do not do yet:
- GitHub App or GitHub API writes
- database storage for proposal state
- real RBAC
- multi-reviewer threads
- websocket/live sync

Those belong in Phase 3, once the editorial workflow itself is stable.

---

## Execution Order

1. Task 1: domain contract
2. Task 2: repository extraction
3. Task 3: structured APIs and conflict checks
4. Task 4: UI refactor
5. Task 5: reviewer session seam
6. Task 6: accepted/canonical view
7. Task 7: docs and verification

This order keeps infrastructure ahead of UX polish and preserves the clean upgrade path to a future remote backend.
