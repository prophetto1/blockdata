# Worker Execution Loop

## What You Are Building

You are building a **compatibility adapter** that makes a copied Kestra UI (`web-kt/`) work against a Supabase backend (`kt.*` schema) instead of a real Kestra server.

The system has three parts:

```
web-kt/                          Kestra's Vue frontend (copied, mostly untouched)
    ↓ sends requests like
    GET /api/v1/main/flows/search
    ↓ hits a compatibility proxy (Vite dev proxy → localhost:8080)
    ↓ forwarded to
supabase/functions/kestra-flows/  Supabase edge function (you build this)
    ↓ queries
    kt.flows                      Postgres table in the kt schema
    ↓ maps rows into Kestra-shaped JSON
    ↓ returns to web-kt
```

You are not redesigning anything. You are making `web-kt` think it is talking to a real Kestra backend.

## Where Things Live

```
kestra-ct/                        Control tower (process docs, not runtime code)
  onboarding/                     You are here. Worker instructions and references.
  pages/flows-list/               First page: packet, capture, implement, verify
  generated/database.types.ts     kt.* row types (staging, from live schema)
  generated/kestra-contract/      Kestra API response types (from openapi.yml)
  page-registry.yaml              Master page backlog and status tracker
  decisions.md                    Architectural decisions that override defaults

web-kt/                           Kestra Vue frontend workspace
  src/components/flows/Flows.vue  The actual flows list page
  src/stores/flow.ts              Store that calls GET /api/v1/main/flows/search
  src/routes/routes.js            Route table

supabase/functions/               Runtime edge functions
  flows/                          EXISTING Blockdata flow function (not yours)
  kestra-flows/                   YOUR adapter function (to be created)
  _shared/kestra-adapter/         YOUR shared query/mapper/filter modules
  _shared/kestra-contract/        Promotion target for contract types (not yet)
```

**Important:** `supabase/functions/flows/` already exists — that is the Blockdata flow system using `project_id`. Your work goes in `supabase/functions/kestra-flows/` using `namespace`. Do not touch the existing `flows/` function.

## The Adapter Pattern

Every page adapter follows the same layered pattern:

```
Handler (index.ts)     → parses HTTP, calls query + mapper, returns response
  ↓ calls
Filter (filters/X.ts)  → normalizes query string into typed filter object
  ↓ passes to
Query (queries/X.ts)   → reads kt.* rows using DB types, returns typed rows
  ↓ passes to
Mapper (mappers/X.ts)  → converts DB rows into Kestra API DTOs, returns JSON
```

DB types and Kestra contract types **meet only in mapper modules**. Queries never import Kestra DTOs. Handlers never inline SQL or response-shape construction.

See [adapter-layout.md](adapter-layout.md) for the full file tree and naming conventions.

## Identity Rule

`kt.*` is Kestra-native. `namespace` is the primary identity concept. Do not introduce `project_id` into any `kt.*` adapter code, DTOs, or endpoint semantics. If a Blockdata crosswalk is needed, it lives outside the `kt.*` compatibility surface. See [decisions.md](../decisions.md).

## Before You Start Your First Page

1. Read the [page-registry.yaml](../page-registry.yaml). Pick the next page by priority (lowest number = highest priority). Right now that is `flows_list`.
2. Read the page's **packet** — that is your scope lock. For flows_list: [packet.md](../pages/flows-list/packet.md).
3. Read the reference docs in this order. Each one takes 2-3 minutes:
   - [worker-instructions.md](worker-instructions.md) — base rules
   - [adapter-layout.md](adapter-layout.md) — where runtime files go
   - [web-kt-baseline.md](web-kt-baseline.md) — how the frontend works, what endpoints it needs at boot
   - [verification-matrix.md](verification-matrix.md) — how to prove things work
4. Skim the type references:
   - [database.types.ts](../generated/database.types.ts) — what columns exist on `kt.flows`, `kt.executions`, etc.
   - [types.gen.ts](../generated/kestra-contract/types.gen.ts) — what the Kestra API response types look like

## The Page Loop

For each page, you produce four documents in order. Do not skip any.

### Step 1: Capture

Read the frontend code named in the packet. Record **observed facts only** in the page's `capture.md`:

- The actual Vue component, store method, and route
- The actual HTTP method, path, query params
- The actual response shape (from code + `openapi.yml`)
- The actual fields the UI renders from the response
- The actual `kt.*` table columns that could supply those fields

No guesses, no fixes, no intentions. If you cannot determine the response shape, **stop and escalate**.

For `flows_list`, inspect these files before writing capture:
- `web-kt/src/components/flows/Flows.vue`
- `web-kt/src/stores/flow.ts`
- `web-kt/src/stores/executions.ts`
- `web-kt/src/routes/routes.js`
- `openapi.yml` (repo root)

### Step 2: Implementation Plan

Expand the page's `implement.md` into a real plan with **exact file paths**:

- Handler: `supabase/functions/kestra-flows/index.ts`
- Query: `supabase/functions/_shared/kestra-adapter/queries/flows.ts`
- Mapper: `supabase/functions/_shared/kestra-adapter/mappers/flows.ts`
- Tests: matching `.test.ts` files alongside each module

The plan must include exact verification commands. If you cannot name exact file targets, the plan is not ready.

### Step 3: Check Bootstrap Blockers

Before writing code, confirm whether the page can actually boot. `web-kt` requires these endpoints to start:

| Endpoint | Why |
|---|---|
| `/api/v1/configs` | App bootstrap loads config before routing |
| `/api/v1/basicAuthValidationErrors` | Auth init check |
| `/api/v1/plugins/...` | Plugin icons and schemas for the UI shell |

If these are missing and the page fails before your adapter endpoint is even reached, record that as a blocker — do not hack around it.

### Step 4: Build

Follow TDD order:
1. Write a failing test for the smallest page-critical behavior
2. Implement the query layer
3. Implement the mapper layer
4. Implement the route handler
5. Wire the frontend only if necessary (usually not — the frontend already calls the right path)

### Step 5: Verify

Run exact commands and record results in the page's `verify.md`. Minimum proof for a page to be "done":

- [ ] Dev server starts
- [ ] The page route loads (e.g. `/ui/main/flows`)
- [ ] The target endpoint returns the expected Kestra-compatible shape
- [ ] Rows render
- [ ] Search works
- [ ] Sort or pagination works if the page exposes them

No "done" claim without `verify.md` evidence.

### Step 6: Update Registry

Set the page status in [page-registry.yaml](../page-registry.yaml) to `done`, `blocked`, or `partial`.

## Status Values

| Status | Meaning |
|---|---|
| `packet_pending` | No packet written yet |
| `packet_seeded` | Packet exists, no work started |
| `in_progress` | Worker is actively building |
| `blocked` | Stopped on a blocker (documented in verify or implement) |
| `partial` | Some pieces work, not fully done |
| `done` | All verification criteria pass |

## Skill Order

Use these skills in this order. Do not skip.

1. `using-superpowers` — at session start
2. Sequential thinking — before capture or planning (think through the page boundary, what could go wrong)
3. `brainstorming` — only if the packet or contract is ambiguous
4. `writing-plans` — before runtime implementation
5. `executing-plans` — during implementation
6. `verification-before-completion` — before any success claim

## Stop Conditions

Stop immediately and escalate if:

- The page contract differs from the packet
- You need another page to complete the assignment
- Auth or tenant behavior is unclear
- Bootstrap endpoints block the page before your endpoint is tested
- You need to import from `sdk/*.gen.ts` (use `kestra-contract/types.gen.ts` instead)
- You are designing new UX instead of matching Kestra behavior
- You are about to change files outside the packet scope

## Hard Rules

- One page at a time.
- `kestra-ct/` is the only active control tower.
- Do not import backend DTO types from `sdk/*.gen.ts`. Use `kestra-contract/types.gen.ts`.
- Do not introduce `project_id` into the `kt.*` surface.
- Do not claim success without fresh verification evidence.
- Use repo-relative paths in all notes.
- Put durable facts in CT files, not in chat.

## Reference Index

| Document | Purpose |
|---|---|
| [worker-instructions.md](worker-instructions.md) | Base policy rules |
| [adapter-layout.md](adapter-layout.md) | Runtime file placement and naming |
| [adapter-readme.md](adapter-readme.md) | Short adapter guide |
| [web-kt-baseline.md](web-kt-baseline.md) | Frontend runtime assumptions and bootstrap deps |
| [verification-matrix.md](verification-matrix.md) | Commands and evidence expectations |
| [decisions.md](../decisions.md) | Architectural decisions |
| [page-registry.yaml](../page-registry.yaml) | Page backlog and status |
| [database.types.ts](../generated/database.types.ts) | `kt` schema row types |
| [types.gen.ts](../generated/kestra-contract/types.gen.ts) | Kestra API contract types |
| [Implementation plan](../plans/2026-03-09-kestra-integration-preparation-implementation-plan.md) | Preparation plan (complete) |
| [Gate assessment](../assessments/2026-03-09-kestra-integration-preparation-gate-assessment.md) | Preparation gate review |
/su