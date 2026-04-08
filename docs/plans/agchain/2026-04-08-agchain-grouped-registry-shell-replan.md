# AGChain Grouped Registry Shell Replan

**Goal:** Replan AGChain registry surfaces around one grouped registry shell in the main AGChain product, with backend data shape and ownership contracts defined first so Tools, Prompts, Scorers, and adjacent registries can compose inside one coherent frontend instead of shipping as isolated, mismatched pages.

**Architecture:** Keep the current AGChain product rails, but replace the "one registry page at a time" framing with a grouped registry shell driven by a canonical backend registry-record envelope. Tools becomes the first real family inside that shell because it already has live project-owned contracts. Prompts and Scorers follow into the same shell using the same normalized data shape. Models remains a separate scope decision, but should still align to the same registry-envelope conventions rather than a one-off page contract.

**Tech Stack:** React + TypeScript + existing AGChain shell layouts, FastAPI, Supabase/Postgres, OpenTelemetry, Vitest, pytest.

**Status:** Draft replan. Intended to redirect the current tools-surface design work before more frontend polish lands on the wrong product shape.

---

## Direct Answer

Yes: the correct direction is a **grouped registry shell**, not a prettier standalone Tools page.

The frontend problem and the backend problem are the same problem viewed from opposite ends:

- the frontend currently exposes one registry family at a time with inconsistent interaction models
- the backend currently exposes family-specific contracts without a shared normalized registry envelope
- the product intent is closer to "multiple related registries managed together" than "one table per route"

That means **data shape comes first**. The grouped shell should not be designed around screenshots or card density first. It should be designed around a canonical registry record model that can safely represent:

- project-owned tool definitions
- prompt templates
- scorer definitions
- attached benchmark bindings
- server-backed/discovered collections
- global or admin-owned supporting catalogs where needed

Only after that envelope is locked should the frontend shell be finalized.

---

## Why The Current Tools-Only Framing Fails

The current user Tools surface is wrong for structural reasons, not cosmetic ones:

1. It treats Tools as a self-contained page instead of one member of a larger registry family.
2. It mixes three mental models:
   - operator registry inspection
   - project authoring
   - benchmark binding/runtime preview
3. It uses a bespoke split table + inspector pattern while neighboring AGChain registries are still placeholders, which makes the product feel arbitrary instead of systemic.

Current evidence in the repo:

- `web/src/pages/agchain/AgchainToolsPage.tsx` is a one-off implementation with a custom table + inline inspector pattern.
- `web/src/pages/agchain/AgchainPromptsPage.tsx` is still a placeholder.
- `web/src/pages/agchain/AgchainScorersPage.tsx` is still a placeholder.
- `services/platform-api/app/domain/agchain/tool_registry.py` is real and project-owned today.
- `docs/plans/agchain/2026-03-31-agchain-scorers-prompts-registry-implementation-plan.md` already frames Prompts + Scorers as interoperating registries.

The navigation already implies a family:

- `/app/agchain/tools`
- `/app/agchain/prompts`
- `/app/agchain/scorers`
- `/app/agchain/parameters`

The product mistake was implementing one member of that family as if it were the whole system.

---

## Source Evidence

### Internal product and plan evidence

- `docs/reports/2026-04-07-tool-integration-platforms-assessment-report.md`
- `docs/plans/agchain/2026-04-01-agchain-tools-surface-implementation-plan.md`
- `docs/plans/agchain/2026-03-31-agchain-scorers-prompts-registry-implementation-plan.md`
- `services/platform-api/app/domain/agchain/types.py`
- `services/platform-api/app/domain/agchain/tool_registry.py`
- `services/platform-api/app/domain/agchain/tool_resolution.py`
- `services/platform-api/app/domain/agchain/task_registry.py`

### External reference evidence

The strongest shortcut reference found during this replan is `I:\LibreChat`.

LibreChat matters here not because it is a direct code port target, but because it already solves the correct product framing:

- multiple capability-management surfaces live inside one grouped shell
- MCP is one managed family, not the entire application
- actions, search, configuration, and admin settings live inside a family-aware shell

Most relevant files:

- `I:\LibreChat\client\src\components\SidePanel\MCPBuilder\MCPBuilderPanel.tsx`
- `I:\LibreChat\client\src\components\SidePanel\MCPBuilder\MCPServerList.tsx`
- `I:\LibreChat\client\src\components\SidePanel\MCPBuilder\MCPServerCard.tsx`
- `I:\LibreChat\client\src\components\Prompts\layouts\PromptsView.tsx`
- `I:\LibreChat\client\src\routes\Dashboard.tsx`

### What not to copy blindly

ToolRegistry remains useful, but only for backend/operator semantics:

- `ToolRegistry` admin HTML is an operator console, not the right end-user shell
- it is the right reference for runtime inventory, status, namespaces, discovery, and execution logs
- it is not the right reference for the AGChain user registry authoring experience

---

## Locked Product Decisions

1. AGChain should adopt a **grouped registry shell** in the main AGChain user area.
2. The grouped shell is a product-level pattern, not a Tools-only redesign.
3. Backend **data shape normalization** is the first priority. Frontend composition must follow the normalized envelope.
4. Tools is the first concrete family because it already has real API/domain seams.
5. Prompts and Scorers should follow into the same shell and should not invent separate page grammars.
6. Benchmark bindings remain first-class, but they are downstream consumers of registries, not the center of the grouped shell.
7. Models remains a separate scope decision for now because the existing plans explicitly preserve a different ownership split. It should align to the same envelope conventions, but it should not be force-merged into the grouped project shell just to make the UI look symmetrical.
8. ToolRegistry/operator admin patterns may inform status and runtime semantics, but they must not become the user-area shell design wholesale.
9. LibreChat is a **reference architecture and product pattern**, not a component-port mandate.

---

## Canonical Data Shape First

The grouped shell should be driven by a normalized contract that every registry family can map into.

### 1. Family descriptor

Every family surfaced in the shell should expose a lightweight descriptor:

```ts
type RegistryFamilyDescriptor = {
  family_key: 'tools' | 'prompts' | 'scorers' | 'parameters' | 'models';
  display_name: string;
  scope_kind: 'global' | 'organization' | 'project' | 'benchmark';
  item_count: number;
  unresolved_count: number;
  draft_count: number;
  disabled_count: number;
  supports_search: boolean;
  supports_versions: boolean;
  supports_bindings: boolean;
};
```

This powers the grouped-shell navigation and summary chips without requiring the frontend to understand each family's native persistence model.

### 2. Registry record summary

Every list item should normalize to one summary envelope:

```ts
type RegistryRecordSummary = {
  family_key: string;
  record_type: 'definition' | 'template' | 'server' | 'binding' | 'target';
  record_id: string | null;
  stable_ref: string;
  display_name: string;
  description: string;
  scope_kind: string;
  source_kind: string | null;
  lifecycle_state: 'draft' | 'published' | 'archived' | 'enabled' | 'disabled' | 'readonly';
  compatibility_state: 'healthy' | 'warning' | 'error' | 'unknown';
  read_only: boolean;
  version_label: string | null;
  updated_at: string | null;
  chips: Array<{ label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }>;
  counts: {
    versions?: number;
    children?: number;
    bindings?: number;
    missing_secrets?: number;
  };
};
```

This is the main row/card contract for the grouped shell.

### 3. Registry record detail

Each family detail panel can extend the summary, but the top-level shape should stay stable:

```ts
type RegistryRecordDetail = {
  summary: RegistryRecordSummary;
  overview: Record<string, unknown>;
  schemas?: {
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
  };
  runtime?: {
    runtime_name?: string | null;
    transport_type?: string | null;
    discovered_children?: Array<Record<string, unknown>>;
    missing_secret_slots?: Array<Record<string, unknown>>;
  };
  dependencies?: {
    linked_records: Array<{
      family_key: string;
      stable_ref: string;
      display_name: string;
      relation: string;
    }>;
  };
  versions?: Array<Record<string, unknown>>;
  allowed_actions: string[];
};
```

The exact family-specific fields can vary. The surrounding envelope should not.

---

## Scope And Ownership Rules

The grouped shell must not flatten unlike scopes into one fake storage model.

### Project-owned families

- Tools
- Prompts
- Scorers
- Parameters

These are the natural grouped-shell core for the AGChain main rail.

### Benchmark-attached consumers

- benchmark version tool bag
- scorer refs on benchmark versions
- prompt refs on scorer defaults or benchmark steps

These should appear as linked consumers and dependency views, not as peers pretending to be top-level registries.

### Global/admin families

- provider definitions
- model targets
- operator-only runtime tools admin

These can share the same registry envelope conventions, but they should stay in the admin/global scope where already locked by existing plans.

---

## Backend Replan

### Phase 1: Add a shared normalization layer

Add a domain adapter that translates family-native rows into the canonical registry envelope instead of forcing the frontend to know every family's raw table shape.

Suggested module:

- `services/platform-api/app/domain/agchain/registry_surface.py`

Responsibilities:

- expose grouped family descriptors
- normalize raw tool/prompt/scorer rows into `RegistryRecordSummary`
- normalize detail payloads into `RegistryRecordDetail`
- aggregate family counts, draft counts, unresolved counts
- attach dependency summaries and compatibility warnings

This layer should call existing family-specific domains rather than replacing them.

### Phase 2: Introduce grouped read APIs

Add grouped-shell read routes before attempting shared write routes.

Suggested read surfaces:

- `GET /agchain/registry/families?project_id=...`
- `GET /agchain/registry/{family_key}/items?...`
- `GET /agchain/registry/{family_key}/items/{stable_ref}?...`

This allows the frontend shell to stabilize around one read model while existing family-specific writes continue to work.

### Phase 3: Preserve family-native writes initially

Do **not** force a shared mutation API in the first pass.

Keep:

- tool create/update/publish/archive in `agchain_tools.py`
- future prompt/scorer CRUD in their own route modules

The grouped shell can route to family-specific dialogs and mutation hooks while still reading through the normalized registry layer.

### Phase 4: Add dependency and binding summaries

The grouped shell must answer:

- where is this tool used?
- which scorer defaults to which prompt?
- which benchmark versions bind this record?
- does this record have unresolved runtime prerequisites?

That means the normalization layer must expose lightweight dependency edges, not just isolated rows.

---

## Frontend Replan

### Shell pattern

The AGChain main rail should keep the existing left nav, but the content area for the registry family should become one shared shell pattern:

1. **Family switcher / grouped header**
   - Tools
   - Prompts
   - Scorers
   - Parameters

2. **Common toolbar**
   - search
   - family-aware filters
   - "new" action for the current family
   - optional grouped health or unresolved counts

3. **Normalized results pane**
   - rows or compact cards based on family
   - same selection semantics across families
   - same summary-chip grammar across families

4. **Detail pane or dialog**
   - same frame and action area
   - family-specific content inside the stable envelope

This is where LibreChat is the best shortcut reference: one grouped management frame with family-specific inner modules.

### What changes for Tools specifically

The current Tools page should stop being a bespoke one-off workspace. In the grouped shell, Tools becomes one family module with:

- normalized list rows driven by `RegistryRecordSummary`
- detail driven by `RegistryRecordDetail`
- family-specific creation/edit dialogs
- explicit dependency sections:
  - runtime/discovery
  - secret-slot readiness
  - benchmark bindings
  - version history

### What should not happen

- Do not port LibreChat UI wholesale.
- Do not rebuild the current Tools table with only better spacing.
- Do not let Prompts and Scorers invent totally different shells once they become real.
- Do not make the grouped shell dependent on benchmark editor state just to render.

---

## Concrete Tools-Family Implications

For the Tools family, the normalized grouped shell should surface four distinct concepts clearly:

1. **Definition**
   - what the tool is
   - public ref
   - source kind
   - approval mode
   - schemas

2. **Runtime**
   - builtin/custom/bridged/mcp_server
   - transport
   - discovered children
   - runtime name(s)
   - compatibility and secret-slot readiness

3. **Versioning**
   - latest version
   - publish/archive state
   - version history

4. **Consumption**
   - benchmark version bindings
   - resolved manifest impact
   - unresolved dependency warnings

The current page compresses these into an awkward two-column page. The grouped shell should make them legible as distinct concerns.

---

## Sequencing Recommendation

### Tranche 1: Data-shape-first foundation

1. Add `registry_surface.py` normalization layer.
2. Add grouped read endpoints for families, items, and detail.
3. Keep existing Tools write routes intact.
4. Update the Tools frontend to read through the grouped envelope even before Prompts and Scorers are implemented.

### Tranche 2: Frontend grouped shell

1. Build shared grouped registry shell components.
2. Rebuild the user Tools page as the first family module inside that shell.
3. Preserve existing route `/app/agchain/tools` but make it render the grouped-shell frame with Tools active.

### Tranche 3: Bring Prompts and Scorers into the shell

1. Replace the placeholder pages.
2. Implement prompt/scorer family adapters into the same normalized envelope.
3. Use the same shell and action grammar as Tools.

### Tranche 4: Reconcile cross-scope registries

1. Align Models/admin registry surfaces to the same envelope vocabulary.
2. Do not collapse scope boundaries.
3. Reuse the registry conventions without breaking the existing project-vs-admin split.

---

## Implementation Consequence

This replan means the correct next artifact is **not** a single-page Tools redesign spec in isolation.

The correct next artifact is a full implementation plan that:

- locks the canonical registry envelope
- enumerates backend adapter and endpoint work
- defines the grouped-shell frontend inventory
- makes Tools the lead family implementation
- makes Prompts and Scorers first followers into the same shell

That is the path most aligned with the current repo state, the existing AGChain plans, the April 7 assessment report, and the LibreChat shortcut insight.
