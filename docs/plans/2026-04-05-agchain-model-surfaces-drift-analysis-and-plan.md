# AGChain Model Surfaces Drift Analysis And Implementation Plan

**Goal:** Define the exact intended split between the project-scoped provider credential page and the admin-scoped provider/model registry page, document the current drift against the supplied reference images, and lock a development plan that returns the surfaces to the required product shape.

**Architecture:** Keep two distinct surfaces. The project page becomes a settings-style provider credential manager that matches the reference page closely and owns project-scoped provider credentials only. The admin page becomes the platform registry for provider definitions and curated model targets, using the same visual grammar as the reference but explicitly excluding API-key entry.

**Tech Stack:** React + TypeScript, existing AGChain shell/admin shell layouts, FastAPI, Supabase Postgres, Vitest, pytest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-05

## Companion Implementation Contract

This document is the drift-analysis and product-shape companion for the AGChain model-surface split.

The backend, platform API, observability, migration, and locked inventory contract for implementation is governed by `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`.

That companion plan is the implementation-ready backend contract because it directly matches the current live seams:

- `services/platform-api/app/api/routes/agchain_models.py` currently mixes user-authenticated reads, admin-only model-target CRUD, and legacy user-scoped `connect-key` / `disconnect-key` credential mutations in one route family.
- `services/platform-api/app/domain/agchain/model_registry.py` currently derives credential state from `user_api_keys` and `user_provider_connections`, keyed by `user_id`, not by `project_id`.
- `services/platform-api/app/domain/agchain/model_provider_catalog.py` is still the static provider-definition source of truth today.
- Existing project-scoped AGChain backends such as `services/platform-api/app/api/routes/agchain_tools.py` and `services/platform-api/app/domain/agchain/project_access.py` already enforce explicit project access and write-access seams that the project credential surface must align with.

Do not implement backend work from this document alone. Use this document for drift analysis, visual contract, and product-scope intent, and use the companion implementation plan for the locked backend execution contract.

## Comparative Analysis And Status Report

### Reference Benchmark Surfaces

The supplied images define two benchmark surfaces:

1. A dark settings page with a primary application rail, a secondary settings rail, a page-local title and description block, and a bordered provider registry table.
2. A centered modal for project-scoped API-key configuration with minimal, single-purpose content: provider identity, docs link, key name, secure input, helper copy, test action, and save action.

From the reference images, the intended grammar is clear:

- settings shell, not workspace split-view
- provider-first list, not model-target-first inspection
- compact row actions, not persistent inspector chrome
- modal editing for project credentials
- page-level separation between project credential management and higher-scope registry management

### Current Surface: Project Models Page

**Mounted route:** `/app/agchain/models`

**Current owner files:**

- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/components/agchain/models/AgchainModelsTable.tsx`
- `web/src/components/agchain/models/AgchainModelInspector.tsx`
- `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx`
- `web/src/hooks/agchain/useAgchainModels.ts`

**Current behavior:**

- The page lives in the AGChain workspace shell, not in a settings shell.
- The header is injected into the top command bar through `ShellPageHeader`, not rendered inside the content body like the reference page.
- The content is a two-column split workspace: provider table on the left, persistent inspector region on the right.
- The table is not credential-only. It is a provider row list that leads into model-target inspection and editing.
- The inspector mixes three responsibilities:
  - provider credential connection and disconnection
  - curated model-target creation and editing
  - target health history and refresh actions

**Current scope mismatch:**

- The project page is currently carrying admin registry responsibilities.
- The project page currently exposes curated model-target management that belongs on the admin registry page.
- The project page currently stores credentials through user-scoped key operations, not project-scoped operations.

### Current Surface: Admin Models Page

**Mounted route:** `/app/agchain-admin/models`

**Current owner file:**

- `web/src/pages/admin/AgchainAdminModelsPage.tsx`

**Current behavior:**

- The route exists and is correctly separated behind the AGChain admin guard.
- The page renders only a sparse placeholder card.
- There is no provider table.
- There is no registry editing.
- There is no provider modal, drawer, or detail surface.
- There is no model-target list or provider-definition editor.

**Current status:**

- Route and guard exist.
- Product surface does not exist.
- Visual contract does not exist.
- Reference benchmark matching is effectively zero.

### Exact Drift Inventory

| Area | Reference Requirement | Current Project Page | Current Admin Page | Drift Status |
|---|---|---|---|---|
| Shell type | Settings-style shell with secondary settings rail | AGChain workspace shell with main workspace rail and no settings-local page body header | Admin shell with generic placeholder page | Drifted on both surfaces |
| Page title treatment | Title and description inside content body | Title injected into top command bar via `ShellPageHeader` | Simple header in page body, but not the reference settings composition | Drifted |
| Primary content pattern | Provider registry table | Provider table plus persistent inspector split view | No table | Drifted |
| Configure interaction | Modal from table row action | Split-pane detail inspector, not modal | No interaction | Drifted |
| Project credential scope | Project-only provider credentials | User-scoped provider credentials via `connect-key` and `disconnect-key` | No credential surface | Drifted |
| Admin scope | Provider and model registry only | Mixed into project page | Not implemented | Drifted |
| Provider row semantics | Provider identity, config status, last updated, simple edit action | Provider identity, status, target count, last checked, configure button | None | Drifted |
| Model target management | Not on project page | Embedded on project page | Missing from admin page | Drifted |
| Secret entry | Project page only | Present on project page, but in the wrong surface composition and wrong storage scope | Absent, which is correct for admin, but only because admin is empty | Partial |
| Settings chrome fidelity | Very close benchmark match expected | Not close; structurally a workspace management tool | Not close; placeholder only | Red |
| State presentation | Configured, inherited, not configured, modal states | Configured, needs attention, not configured, no targets, inline split inspector states | Placeholder only | Drifted |

### Current Status Summary

The current implementation is not a small styling miss. It is a scope collision:

1. The project page is carrying both project credential work and admin registry work.
2. The admin counterpart page has been split at the route and permission level, but not at the product or visual level.
3. The current project page does not benchmark the supplied reference images closely enough in shell, content pattern, interaction model, or scope boundary.
4. The required correction is not to extend the current split-pane project page. The required correction is to return drift back by separating responsibilities and remounting them into the correct surfaces.

## Requirement Definition

### What The Requirement Is

The requirement is to produce two separate but visually related surfaces:

1. **Project Models Page**

   This page is the project-scoped provider credential page. It should look and feel like the supplied reference page. It should list providers, show configuration status per provider, and open a focused credential modal for provider configuration. This page is where project-scoped credentials are added, tested, replaced, or removed.

2. **Admin Models Page**

   This page is the admin-scoped platform registry. It should inherit the same visual language and compositional discipline as the reference page, but extend the scope of configurable information. This is where admins configure provider definitions and curated model targets. This page must not include API-key entry or secret management.

### What The Requirement Is Not

- It is not a request to keep the current project split-pane page and lightly restyle it.
- It is not a request to put project credentials on the admin page.
- It is not a request to collapse provider registry and project credentials into one multipurpose page.
- It is not a request to expand into a broad new settings program outside these two surfaces.
- It is not a request to invent unrelated organization-key management work in this same tranche.

### Scope Boundary

This document is intentionally limited to:

- the project provider credential page
- the admin provider/model registry page
- the functional split between them
- the visual contract needed to benchmark the reference images closely

Out of scope for this document unless separately requested:

- broad organization credential management
- unrelated AGChain settings sections
- unrelated admin platform surfaces
- broader shell refactors beyond what is needed to make these two surfaces match their intended presentation

## Pre-Implementation Contract

No major product, scope, surface-ownership, or interaction decision may be improvised during implementation. If implementation reveals that one of the locked decisions below is wrong, the work stops and this document is revised before coding continues.

### Locked Product Decisions

1. The project page and the admin page are separate product surfaces with separate responsibilities.
2. The project page owns project-scoped provider credential configuration only.
3. The admin page owns provider-definition and curated model-target registry management only.
4. API-key entry is forbidden on the admin page.
5. Curated model-target editing is forbidden on the project page.
6. The project page must benchmark the reference images closely in shell feel, content structure, row density, and modal behavior.
7. The admin page must inherit that same visual grammar instead of continuing as a placeholder or as a generic admin card.
8. Drift must be returned back, not preserved behind new polish.

### Locked Acceptance Contract

The work is only complete when all of the following are true:

1. The project page presents a provider-first settings surface, not a split-pane registry workspace.
2. Clicking a provider on the project page opens a focused credential modal rather than exposing model-target registry controls.
3. The admin page presents a provider-first registry surface with provider and model configuration controls but no secret-entry fields.
4. The project page no longer contains curated model-target create or edit actions.
5. The admin page no longer presents as a placeholder.
6. A reviewer can compare the finished project page to the supplied images and immediately recognize the same shell grammar, content composition, and modal interaction pattern.

## Drift Return Rules

These are explicit reversal rules for the current drift:

1. Remove registry-editing responsibility from `AgchainModelsPage`.
2. Do not promote `AgchainAdminModelsPage` by copying the current project split-pane inspector wholesale.
3. Do not preserve user-scoped credential semantics if the intended product is project-scoped credentials.
4. Do not preserve the current project-page coupling between provider credential UI and model-target CRUD.
5. Do not add extra admin functionality outside provider definitions and curated model targets.

## Implementation Plan

### Phase 1: Lock The Surface Split In Data And API Terms

**Goal:** Make it impossible for the frontend to keep mixing project credential management with admin registry management.

**Step 1:** Define a project-scoped provider credential contract.

- Introduce a dedicated project credential read/write seam instead of continuing to treat `user_api_keys` as the project source of truth.
- The project credential contract should answer only:
  - provider status for the focused project
  - whether a project override exists
  - when it was last updated
  - whether test/save/remove succeeded

**Step 2:** Define a provider-registry contract for admin use.

- Provider definitions must become admin-configurable rather than remaining only in the static Python catalog.
- Curated model-target CRUD stays in the admin registry contract.

**Step 3:** Keep the two contracts separate.

- Project surface contract: provider credential status and mutations.
- Admin surface contract: provider definitions and model targets.
- No endpoint should serve both responsibilities in one payload shape.

### Phase 2: Correct The Backend Ownership

**Goal:** Make backend ownership match the product split.

**Likely backend changes:**

- New provider-registry persistence for provider definitions now hard-coded in `model_provider_catalog.py`
- New project-provider-credential persistence keyed to project scope
- Keep `agchain_model_targets` as the admin-owned curated target registry

**Backend file directions:**

- Modify or replace `services/platform-api/app/domain/agchain/model_provider_catalog.py`
- Add provider-registry read/write domain functions under `services/platform-api/app/domain/agchain/`
- Add project-provider-credential domain functions under `services/platform-api/app/domain/agchain/`
- Extend route coverage under `services/platform-api/app/api/routes/`
- Add migrations under `supabase/migrations/`

### Phase 3: Rebuild The Project Page To Match The Reference Contract

**Goal:** Replace the current mixed-responsibility workspace with the intended provider credential page.

**Step 1:** Change the page information architecture.

- Keep the route `/app/agchain/models` unless a separate approved routing change is requested.
- Recompose the page as a settings-style provider list page.
- Remove the persistent right-side registry inspector from the project page.

**Step 2:** Rebuild the table semantics.

- Each row represents one provider.
- Show provider name and supporting provider metadata only.
- Show project credential status.
- Show last updated.
- Provide one compact edit/configure action.

**Step 3:** Replace inline editing with a modal.

- Opening a provider launches a centered project credential modal.
- The modal contains no curated model-target editing.
- The modal contains only project credential controls and related project-scoped helper copy.

**Step 4:** Add required states.

- loading
- not configured
- configured
- save in progress
- test in progress
- invalid test result
- save error
- remove/disconnect confirmation if required

### Phase 4: Build The Admin Registry Page As The Counterpart Surface

**Goal:** Replace the admin placeholder with the intended registry-management page.

**Step 1:** Preserve the visual grammar of the reference page.

- Same overall page rhythm
- Same provider-first list structure
- Same compact row action model
- Same dark settings-style density and framing

**Step 2:** Expand scope only where required.

- Provider row opens an admin registry editor surface
- Admin editor includes:
  - provider metadata
  - supported auth kinds
  - custom base URL support
  - default probe strategy
  - notes and enabled state
  - curated model-target list
  - add/edit target controls

**Step 3:** Keep secrets out of the admin surface.

- No API key input
- No masked key status chip
- No save-test key flow
- No connection or disconnect action for secrets

**Step 4:** Add admin-only states.

- provider has no curated models
- provider disabled
- provider metadata dirty
- target create/edit open
- target health status visible
- refresh or validation pending

### Phase 5: Align Shell And Navigation Without Scope Creep

**Goal:** Make the pages feel like the benchmark without expanding into unrelated shell rewrites.

**Step 1:** Give both surfaces the correct content framing.

- Project page should read like a settings page, not a workspace operator console.
- Admin page should read like the admin counterpart to that same settings grammar.

**Step 2:** Only touch shell files needed for these pages.

Possible files:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`

**Step 3:** Do not launch a broad shell redesign from this work.

### Phase 6: Replace Drifted Frontend Ownership

**Goal:** Stop one hook and one page from owning both surfaces.

**Required frontend split:**

- one project-page hook/service for project provider credentials
- one admin-page hook/service for provider registry and model targets

**Do not keep:**

- one hook that drives both project credentials and admin registry editing

### Phase 7: Verification

**Project page verification:**

1. Provider list renders in the settings-style page layout.
2. Configure action opens the project credential modal.
3. Modal contains credential-only controls.
4. Model-target CRUD is absent from the project page.

**Admin page verification:**

1. Placeholder copy is gone.
2. Provider registry table renders.
3. Provider editor surfaces provider metadata and model-target management.
4. No API-key entry appears anywhere on the admin page.

## Frontend Visual Deliverable And Output Guarantee

### Shared Visual Contract

Both pages must share the following visual language:

- dark settings-style composition
- clear top chrome and left navigation framing
- page-local title and description block
- one dominant bordered registry card in the content area
- thin row dividers
- compact action affordances
- restrained, product-grade modal treatment
- no workspace-console split-pane feel on the finished project page

### Project Page Guarantee

The finished project page will look and behave like this:

- A settings-like provider page with providers listed in a clean vertical table
- Provider rows show provider identity, project configuration status, and last-updated information
- The primary row action opens a centered credential modal
- The modal is narrow, focused, and secret-oriented
- The modal includes provider identity, docs affordance, key label/name, secure input, helper text, test action, and save action
- The page does not reveal curated model-target cards, target health history, or admin registry editing controls

### Admin Page Guarantee

The finished admin page will look and behave like this:

- A visually matched counterpart to the project page
- The same general page framing, density, and registry rhythm
- A provider-first registry list in the main page body
- Row interaction opens an admin registry editor surface
- The editor exposes provider-definition fields and curated model-target management
- The admin editor never exposes secret-entry controls

### State-Based Behavioral Differences

**Project page states**

- `not configured`: provider row shows missing credential state; modal invites project credential entry
- `configured`: provider row shows configured state; modal supports replace/test/remove
- `saving`: save button shows pending state; modal remains open
- `test failed`: inline validation state appears in the modal; table state does not falsely advance
- `save failed`: modal preserves user input and shows error feedback

**Admin page states**

- `provider unconfigured`: provider metadata incomplete; row shows attention state
- `provider configured with zero models`: provider editor shows empty curated-model section
- `provider configured with models`: provider editor lists model targets and edit affordances
- `editing target`: target editor surface is open and provider metadata remains visible
- `validation or probe refresh pending`: admin-only progress state appears without introducing secret controls

### Surface Inventory

The intended end state includes these surfaces and no broader expansion:

1. Project provider page
2. Project credential modal
3. Admin provider registry page
4. Admin provider editor surface
5. Admin add/edit model-target surface

## Frontend Surface Area

### Modified existing pages

- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `web/src/pages/admin/AgchainAdminModelsPage.tsx`

### Modified existing shared files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/lib/agchainModels.ts`

### New frontend files expected

- `web/src/components/agchain/models/ProjectProviderCredentialsTable.tsx`
- `web/src/components/agchain/models/ProjectProviderKeyModal.tsx`
- `web/src/components/admin/AgchainAdminProviderRegistryTable.tsx`
- `web/src/components/admin/AgchainAdminProviderEditor.tsx`
- `web/src/components/admin/AgchainAdminModelTargetEditor.tsx`
- `web/src/hooks/agchain/useProjectProviderCredentials.ts`
- `web/src/hooks/agchain/useAdminProviderRegistry.ts`

## Backend And Persistence Surface

Backend execution is intentionally delegated to `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`.

This analysis document keeps the directly verified backend facts that implementation must respect:

1. The current mixed route family lives in `services/platform-api/app/api/routes/agchain_models.py`.
2. The current registry table spine is `public.agchain_model_targets`.
3. The current credential seam is legacy user-scoped storage via `public.user_api_keys` and `public.user_provider_connections`.
4. The current provider-definition source is the static catalog in `services/platform-api/app/domain/agchain/model_provider_catalog.py`.
5. The project-scoped correction must align with the repo's existing project-access backend conventions rather than inventing a one-off ownership seam.

For exact new and modified endpoints, auth requirements, request and response contracts, touched tables, observability surfaces, migration filenames, and file inventory, follow the companion implementation plan rather than the retired high-level bullets that previously lived here.

## Completion Criteria

The work is complete only when all of the following are true:

1. The project page is visually recognizable as the reference-derived credential page.
2. The admin page is visually recognizable as the reference-derived registry counterpart.
3. The project page no longer owns curated model-target CRUD.
4. The admin page no longer presents as a placeholder.
5. The project page is not backed by user-scoped credential semantics if the product contract is project-scoped credentials.
6. The final scope remains limited to the two requested surfaces and their necessary supporting seams.
