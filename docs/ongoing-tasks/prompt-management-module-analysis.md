# Prompt Management Module — Standalone Product Analysis

**Source studied:** Langfuse prompt management (~7,300 LOC, MIT-adjacent open source)
**Date:** 2026-02-11

This document analyzes Langfuse's prompt management feature as a reference implementation for a **standalone, self-contained prompt management module** — a product you integrate into web solutions, not something coupled to any particular repo or platform.

---

## 1) What the module does (product scope)

A prompt management module gives teams a structured way to:

1. **Author** prompts (text or chat-message arrays) with a rich editor.
2. **Version** every edit automatically (auto-incrementing integer per prompt name).
3. **Label** versions for deployment targets ("production", "staging", "latest").
4. **Compose** prompts from other prompts via inline dependency tags.
5. **Resolve** the full dependency graph at retrieval time, returning a fully-expanded prompt.
6. **Protect** critical labels so only authorized users can promote to them.
7. **Cache** resolved prompts for fast retrieval (Redis-backed, with proper invalidation).

The module is consumed through:
- A **REST API** (for SDKs, CI/CD, external integrations).
- A **frontend UI** (for human authoring, version management, label promotion).

---

## 2) Data model (three tables)

### `Prompt`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID/CUID | PK |
| `name` | TEXT | Prompt identifier; supports `/` for folder hierarchy |
| `version` | INT | Auto-incremented per name |
| `type` | TEXT | `"text"` or `"chat"` |
| `prompt` | JSON | String for text; `ChatMessage[]` for chat |
| `config` | JSON | Arbitrary metadata (model params, temperature, etc.) |
| `labels` | TEXT[] | Deployment targets; unique per name (moving a label removes it from the prior version) |
| `tags` | TEXT[] | Organizational; consistent across all versions of a name |
| `commit_message` | TEXT? | Git-style change note |
| `created_by` | TEXT | User ID or `"API"` |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Constraint:** `UNIQUE(name, version)` — or `UNIQUE(tenant_id, name, version)` for multi-tenant.

### `PromptDependency`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID/CUID | PK |
| `parent_id` | FK → Prompt | The prompt containing the reference |
| `child_name` | TEXT | Name of the referenced prompt |
| `child_label` | TEXT? | Reference by label (mutually exclusive with version) |
| `child_version` | INT? | Reference by version (mutually exclusive with label) |

**Indexes:** `(parent_id)`, `(child_name)`.

### `PromptProtectedLabel`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID/CUID | PK |
| `label` | TEXT | e.g. `"production"` |

**Constraint:** `UNIQUE(label)` — or `UNIQUE(tenant_id, label)` for multi-tenant.

---

## 3) Prompt dependencies (the only novel feature)

Everything else in this module — CRUD, versioning, labels, tags — is table-stakes content management. **Prompt dependencies** are the differentiating feature.

### 3.1 Syntax

Dependencies are inline tags embedded in the prompt content:

```
@@@langfusePrompt:name=common-instructions|label=production@@@

You are a helpful assistant. {{user_input}}

Additional context: @@@langfusePrompt:name=domain-knowledge|version=3@@@
```

A tag always has two parts: `name=<prompt_name>` and either `version=<int>` or `label=<string>`.

### 3.2 Parsing

Single regex: `/@@@langfusePrompt:(.*?)@@@/g`

Parse the inner content by splitting on `|`, validate that the first part starts with `name=` and exactly two parts exist. Yields `{ name, type: "version"|"label", version?, label? }`.

Applied to the full `JSON.stringify(prompt)` so it works for both text strings and chat message arrays.

### 3.3 Resolution algorithm (retrieval-time)

```
resolve(prompt, depth=0, seen=Set):
  1. If depth >= MAX_DEPTH (5): throw "max nesting exceeded"
  2. If prompt.id in seen: throw "circular dependency"
  3. Add prompt.id to seen
  4. Fetch PromptDependency rows for this prompt
  5. For each dependency:
     a. Fetch child prompt by (name + version) or (name + label)
     b. Validate child is type "text" (chat prompts cannot be dependencies)
     c. Recursively resolve child → get fully-expanded string
     d. Regex-replace the tag in the parent's content with the resolved child
  6. Remove prompt.id from seen (allows diamond dependencies: A→B, A→C, B→D, C→D)
  7. Return resolved content
```

Key design choices:
- **Resolve at retrieval time**, not at save time. This means updating a child prompt automatically propagates to all parents on next fetch — no stale copies.
- **Depth limit of 5** — defense-in-depth alongside circular detection.
- **Diamond dependencies are allowed** (A references B and C; both B and C reference D). The `seen` set is cleaned up after each branch resolves.
- **Only text prompts can be inlined.** Chat prompts (message arrays) cannot be dependency targets because inline string replacement doesn't make sense for structured message lists.

### 3.4 Deletion protection

Before deleting a prompt, the module queries `PromptDependency` for rows where `child_name = <this prompt's name>`. If any exist, deletion is blocked with an error listing the dependent prompts. This prevents breaking the graph.

---

## 4) Versioning and label model

### Versions
- Auto-increment: `MAX(version WHERE name = X) + 1`
- Every new version automatically gets label `"latest"`
- Immutable once created (content never changes; you create a new version instead)
- `commit_message` tracks the intent of each version

### Labels (deployment targets)
- Labels are **unique per prompt name**: setting `"production"` on v3 atomically removes it from v2.
- Default fetch behavior: if no version or label is specified, the API returns the version labeled `"production"`.
- Protected labels require elevated permissions to assign.

### Tags (organizational)
- Tags are **shared across all versions** of a prompt name.
- Creating a new version inherits tags from the previous version.
- Used for filtering/grouping in the UI, not for retrieval.

### Promotion flow
1. Create new version (gets `"latest"` label, no `"production"` label).
2. Test in staging.
3. Call `setLabels(versionId, ["production"])` to promote.
4. Previous production version loses the label atomically.

---

## 5) API surface

### REST (public, for SDKs and external integrations)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/prompts/:name` | Fetch prompt (query: `?version=` or `?label=`, default: `"production"`). Returns resolved content. |
| `GET` | `/prompts` | List prompt metadata (pagination, filtering by name/label/tag) |
| `POST` | `/prompts` | Create new version. Body: `{ name, prompt, type, config?, labels?, tags?, commitMessage? }` |
| `DELETE` | `/prompts/:name` | Delete versions (query: `?version=` or `?label=`; no params = delete all) |

### Internal (tRPC or equivalent, for the management UI)

30+ procedures covering:
- CRUD (create, read by ID, list, delete, delete single version)
- Labels (set labels, list all labels, protected label management)
- Tags (update tags for all versions of a name)
- Dependencies (resolve graph, get link options)
- Versioning (list all versions, version metrics)
- Utilities (duplicate prompt, check if any prompts exist, count)

---

## 6) Frontend components (~2,800 LOC)

| Component | LOC | Purpose |
|-----------|-----|---------|
| `NewPromptForm` | ~450 | Create/edit form. Text/Chat tab switcher, CodeMirror editor with dependency linking, config JSON editor, label checkbox, commit message. |
| `PromptDetail` | ~700 | View prompt with version history sidebar. Shows resolved vs. tagged view (toggle). SDK code examples. Label badges, tag pills. |
| `PromptsTable` | ~450 | List view with folder hierarchy. Columns: name, version, labels, tags, updated, creator. Filtering, sorting, pagination. |
| `PromptHistoryNode` | ~240 | Version history tree. Shows version number, labels, creator, date, commit message. Click to switch active version. |
| `PromptSelectionDialog` | ~250 | Modal for inserting dependency tags. Select prompt name → choose version or label → generates tag → inserts at cursor. |
| `PromptLinkingEditor` | ~90 | CodeMirror wrapper with "+ Add prompt reference" button. |
| `SetPromptVersionLabels` | ~150 | Label management UI with protected-label warnings. |
| `ProtectedLabelsSettings` | ~230 | Admin UI for managing protected labels. |
| `PromptVersionDiffDialog` | ~140 | Diff view between two versions. |
| Misc (delete, duplicate, utils) | ~100 | Confirmation dialogs, rendering helpers. |

The UI is straightforward forms + tables + a code editor. No complex drag-and-drop, no canvas, no real-time collaboration. CodeMirror is the heaviest dependency.

---

## 7) What's portable vs. what's Langfuse-specific

### Fully portable (the standalone module)

- **Data model** (3 tables above) — generic, no external FK dependencies
- **Dependency parsing** (62 LOC) — pure regex + string manipulation
- **Resolution algorithm** (PromptService, ~480 LOC) — needs only a DB client and optional Redis
- **REST API contract** — standard CRUD + resolve endpoint
- **Versioning/label/tag logic** — generic content management pattern
- **Frontend components** — standard React forms/tables, adaptable to any design system

### Langfuse-specific (strip when extracting)

- **Multi-tenancy via `projectId`** — replace with your own tenant model or remove for single-tenant
- **RBAC** (`prompts:CUD`, `prompts:read` permissions) — replace with your auth layer
- **Observability metrics** — prompt usage counts, token costs, scores, latency (this is Langfuse's core business; irrelevant to standalone)
- **Experiment/dataset integration** — links prompts to Langfuse evaluation workflows
- **Webhook event sourcing** — Langfuse-specific event bus
- **OpenTelemetry instrumentation** — Langfuse monitoring
- **Audit trail** (`createdBy` tracking, API key attribution) — nice to have but not core

### Portability by component

| Component | Portable | Effort to extract |
|-----------|----------|-------------------|
| Dependency resolution engine | 100% | Copy as-is |
| Data model (Prisma schema) | 90% | Remove `projectId` FK or adapt to your tenant model |
| REST API | 85% | Strip Langfuse auth middleware, keep contract |
| tRPC router | 70% | Heavy RBAC removal; core logic is clean |
| Frontend components | 75% | Replace Langfuse table/metrics integration, restyle |
| Caching layer | 95% | Generic Redis pattern |

---

## 8) Complexity assessment

This is **not a complex system**. It's a well-built but structurally simple CRUD module with one clever feature (dependency resolution).

### What makes it simple
- Three database tables
- One non-trivial algorithm (recursive resolution, ~100 lines of actual logic)
- Standard REST API with no streaming, no websockets, no real-time
- Frontend is forms + tables + a code editor — no rich interactions
- No background jobs, no queues, no event sourcing required for core functionality
- No external service dependencies (Redis is optional, for caching only)

### What makes it production-grade (and worth studying)
- Atomic label movements (one transaction)
- Circular dependency detection with diamond-dependency support
- Deletion protection (won't let you break the graph)
- Cache invalidation strategy (lock-based, prevents race conditions)
- Comprehensive test suite (~6,300 LOC of tests)

### Rebuild estimate (standalone, from scratch)

| Layer | Effort |
|-------|--------|
| Data model + migrations | 0.5 days |
| Core service (CRUD + resolution + caching) | 2–3 days |
| REST API | 1 day |
| Frontend (forms, table, editor, dialogs) | 3–4 days |
| Tests | 2 days |
| **Total** | **~1.5–2 weeks** |

This assumes you're building with a modern stack (any ORM, any component library, CodeMirror or Monaco for the editor). The dependency resolution algorithm is the only part that requires careful implementation — the rest is standard web development.

---

## 9) The one feature worth extracting: prompt dependencies

If you already have basic prompt storage (name, content, version), the **only feature from Langfuse's prompt management that adds genuine value** is the dependency system:

1. The tag syntax (`@@@promptRef:name=X|label=Y@@@` or similar)
2. The parsing regex
3. The recursive resolution with depth limit + circular detection
4. The `PromptDependency` join table for efficient querying
5. The deletion-protection check

This is roughly **~550 LOC of backend logic** (parsing + resolution + dependency CRUD) plus **~340 LOC of frontend** (linking editor + selection dialog). Under 900 lines total for the novel functionality.

Everything else — versioning, labels, tags, CRUD forms, list views — is standard content management that any team has built before or can scaffold with their existing patterns.
