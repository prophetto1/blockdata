# AGChain Project Models And Admin Registry Plan

**Goal:** Define the corrected AGChain models split so implementation can proceed without ambiguity: the project-facing Models surface owns provider API key configuration only, while the AGChain Admin Models surface owns the platform model registry for providers and model targets. Both surfaces should share the same list-first visual language and interaction feel, but they must not collapse into one mixed-responsibility page.

**Status:** Draft  
**Date:** 2026-04-05  
**Primary intent sources:**  
- `docs/plans/agchain/models/2026-04-03-agchain-models-page-status-report.md`  
- `docs/plans/agchain/__complete-previous/2026-03-31-agchain-models-surface-implementation-plan-v2.md`  
- user clarification in the 2026-04-05 thread defining the project-vs-admin split  

## Direct Requirement Definition

The requirement is:

1. The **project-facing Models page** is the place where AGChain users configure provider API keys for the current project.
2. The **AGChain Admin Models page** is the platform registry where AGChain administrators configure providers and the model targets available under those providers.
3. The **AGChain Admin Models page does not allow API key entry**.
4. The **project-facing Models page does not allow provider-model registry authoring** such as creating, editing, or health-managing the platform model catalog.
5. Both pages should **look and feel like the same product family**:
   - list-first surface
   - clean settings-style table layout
   - right-side action affordances or modal editing
   - strong dark-theme information density
   - low-clutter, operator-focused presentation
6. The admin surface should **extend scope**, not change design language.

## Correct Product Split

### Surface A: Project Models

**Purpose:** configure provider credentials for the current AGChain project.

This page answers:

- Which providers are available to this project?
- Is each provider configured for this project?
- Can the operator test, save, rotate, or remove the project-scoped API key?

This page does **not** answer:

- Which model targets exist globally?
- Which providers are platform-enabled vs disabled?
- Which target has which `qualified_model`, `api_base`, `probe_strategy`, or capability metadata?
- Which targets should be added, edited, disabled, or health-checked at platform level?

### Surface B: AGChain Admin Models

**Purpose:** maintain the platform registry of providers and model targets.

This page answers:

- Which providers exist in the AGChain platform registry?
- Which providers are enabled, supported, or incomplete?
- Which model targets are defined under each provider?
- What metadata governs each target?
- Which targets are healthy, degraded, disabled, default, evaluated-capable, or judge-capable?

This page does **not** answer:

- What is the current project's API key for a provider?
- Can an operator enter or test a secret?
- Can a project-level user connect/disconnect provider credentials here?

## Scope Ownership Contract

### Project Models owns

- provider list for the current project
- project-scoped credential state
- configure key modal
- key test flow
- save/disconnect flow
- masked suffix / last updated / validation result
- project-level status messaging

### AGChain Admin Models owns

- provider registry inventory
- provider metadata
- model target inventory under each provider
- create/edit/disable provider targets
- target capability metadata
- target compatibility metadata
- target health and readiness operations
- platform-level registry validation

### Explicitly out of scope for Project Models

- create model target
- edit model target
- refresh health
- manage `api_base`
- manage `qualified_model`
- manage provider catalog membership

### Explicitly out of scope for AGChain Admin Models

- connect API key
- disconnect API key
- test API key
- show secret entry fields
- display project secret values or masked suffixes

## Information Architecture Contract

### Project route

- primary route should remain user-facing inside the AGChain shell
- the route name should read as a project/operator surface, not as an admin workspace
- if the existing `/app/agchain/models` route remains mounted, it should be recast to this project-level contract

### Admin route

- the existing `/app/agchain-admin/models` route becomes the authoritative admin registry surface
- it remains AGChain-admin guarded
- it is not mounted inside the normal project operator path

## Visual Contract

The intended visual reference is the settings page pattern shown in the supplied screenshots:

- left navigation rail remains stable
- central content pane uses a settings-page rhythm
- top area contains page title plus a short explanatory sentence
- main content begins with a framed list/table of providers
- row actions are lightweight, icon-first or “Configure” affordances
- deeper action happens in a modal or clearly bounded editor surface
- background remains dark and dense, with restrained accent use
- page should feel operational and precise, not like a dashboard collage

### Shared look-and-feel across both surfaces

- same page header structure
- same provider table proportions
- same row density
- same icon treatment for providers
- same typography scale
- same empty-state treatment
- same modal styling language
- same error and status badge family

### How the two surfaces differ visually

**Project Models**
- simpler table
- fewer columns
- one dominant action: configure credential
- modal centered around one provider secret
- no nested target list in the page body

**AGChain Admin Models**
- same base table look, but richer scope
- provider row can open an extended inspector or detail panel
- supports nested model target management under the selected provider
- richer metadata density is allowed
- edit/create surfaces are administrative forms, not credential dialogs

## State And Behavior Contract

### Project Models states

#### List states

- loading providers
- ready with rows
- empty if no providers are available to the project
- route-level error if provider status cannot load

#### Provider row states

- configured
- not configured
- invalid or failed validation
- testing in progress
- saving in progress
- disconnecting in progress

#### Configure key modal states

- closed
- open with empty input
- open with existing configured state and rotate/remove actions
- testing
- test passed
- test failed with inline error
- saving
- save success
- disconnect confirmation or explicit destructive action state

### AGChain Admin Models states

#### List states

- loading providers and registry metadata
- ready with providers
- empty if registry is unseeded
- route-level error if registry cannot load

#### Provider registry states

- enabled
- disabled
- incomplete metadata
- warning or degraded health population
- selected provider

#### Model target states

- enabled
- disabled
- healthy
- degraded
- error
- draft or incomplete metadata
- evaluated-capable
- judge-capable
- default target

#### Admin edit states

- add provider target modal or panel open
- edit provider target modal or panel open
- validation error on required fields
- saving
- save success
- health refresh in progress

## Surface Inventory

### Project-facing surfaces

1. **Project Models page**
   - list of providers available to the project
   - status column
   - last updated column
   - configure action

2. **Configure API Key modal**
   - provider icon and name
   - env-var style key label if desired
   - secure text input
   - test key button
   - save button
   - disconnect/remove action when configured
   - inline validation/error copy

3. **Project Models empty state**
   - if no providers are exposed to the project

4. **Project Models error state**
   - retryable load failure

### Admin-facing surfaces

1. **AGChain Admin Models page**
   - provider registry table
   - richer provider metadata
   - select provider to inspect registry contents

2. **Admin provider inspector or details pane**
   - provider summary
   - provider-level metadata
   - model targets list for selected provider

3. **Create model target modal or panel**
   - add a new target under a provider

4. **Edit model target modal or panel**
   - edit target metadata

5. **Admin registry empty state**
   - when no providers/targets are registered

6. **Admin registry error state**
   - retryable load failure

## Implementation Plan

## Phase 1: Lock the product contract in code and docs

### Step 1.1: freeze the split

- update planning docs so the corrected split is explicit
- state that project Models owns credentials only
- state that AGChain Admin Models owns registry only
- mark mixed current implementation as transitional, not target truth

### Step 1.2: stop treating the current mixed page as compliant

- remove language that suggests `/app/agchain/models` may continue owning target CRUD
- update evaluations and acceptance notes so the admin page becomes the destination for registry controls

**Result:** all later work executes against one contract instead of two competing interpretations.

## Phase 2: Re-shape the frontend boundaries

### Step 2.1: simplify the project-facing data model

- split the current `useAgchainModels` frontend contract into:
  - project credential-oriented read/write logic
  - admin registry-oriented read/write logic
- create separate hooks or services so the project page no longer imports target CRUD concerns

Likely frontend seams:

- `web/src/hooks/agchain/useAgchainProjectModels.ts`
- `web/src/hooks/agchain/useAgchainAdminModels.ts`
- `web/src/lib/agchainProjectModels.ts`
- `web/src/lib/agchainAdminModels.ts`

### Step 2.2: simplify the project page component

- recast [AgchainModelsPage.tsx](/tsclient/E/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx) into the project contract
- keep the current list-first page composition
- remove the target-management inspector content
- replace it with either:
  - row-triggered centered modal, matching the screenshot more closely, or
  - a lightweight right-side provider credential panel if the team prefers inline continuity

### Step 2.3: move the target-management UI off the project page

- remove from the project page:
  - add target
  - edit target
  - refresh health
  - recent health history
  - target compatibility display
  - target metadata editor

### Step 2.4: build the AGChain Admin Models page on the same visual skeleton

- replace [AgchainAdminModelsPage.tsx](/tsclient/E/writing-system/web/src/pages/admin/AgchainAdminModelsPage.tsx) placeholder copy with a real registry page
- keep the same family resemblance as the project page:
  - header
  - provider table
  - clean content frame
- extend the right-side/admin editing depth

**Result:** the project and admin surfaces feel related but no longer overlap in responsibility.

## Phase 3: Introduce admin registry composition

### Step 3.1: define the admin list contract

The admin provider table should support columns such as:

- provider name
- registry status
- enabled/disabled
- target count
- default target or primary target
- last checked
- action affordance

### Step 3.2: define the provider inspector contract

Selecting a provider should reveal:

- provider summary
- provider metadata
- provider capability metadata
- list of model targets under that provider
- actions to create/edit/disable targets

### Step 3.3: define model target form contract

The admin edit/create form should support, at minimum:

- label
- provider slug
- model name
- qualified model
- auth kind
- api base
- enabled
- probe strategy
- supports evaluated
- supports judge
- notes
- capabilities payload

### Step 3.4: keep secrets out of admin UI

- no API key field
- no test key action
- no masked suffix
- no disconnect flow
- no project credential status as an interactive field

**Result:** the admin page becomes a real platform registry surface instead of a shell placeholder.

## Phase 4: Align backend route ownership

### Step 4.1: preserve existing route families but separate frontend usage

Current route inventory can continue to back both surfaces, but frontend ownership should be explicit:

- project page uses only credential-safe provider summary plus connect/disconnect/test flows
- admin page uses provider and model-target registry routes

### Step 4.2: add a project-facing provider summary contract if needed

If the current route set makes the project page over-fetch registry detail, add or formalize a lighter project-facing contract so the project page can load:

- provider name
- provider icon or display metadata
- credential state for the current project
- last updated

without depending on the full target registry response shape.

### Step 4.3: keep admin mutations admin-guarded

- create/edit/disable target remains admin or superuser-owned
- project-facing credential actions remain project/operator-owned under the approved auth boundary

**Result:** backend semantics match the frontend split instead of silently encouraging the mixed page again.

## Phase 5: Build the visual deliverables explicitly

### Step 5.1: create project models visual proof

Required artifact set:

- full-page screenshot: project Models list
- modal screenshot: configure API key open
- screenshot: configured provider state
- screenshot: validation error or failed test state

### Step 5.2: create admin registry visual proof

Required artifact set:

- full-page screenshot: admin Models provider registry list
- screenshot: provider inspector open
- screenshot: create target form
- screenshot: edit target form populated
- screenshot: empty state or unseeded state if supported

### Step 5.3: capture state-behavior evidence

Required written evidence:

- project page state matrix
- admin page state matrix
- explicit note that API key entry is absent from admin
- explicit note that target CRUD is absent from project page

**Result:** the end-state is reviewable from artifacts, not only from code.

## Frontend Deliverable / Output Guarantee

The frontend is only considered complete when all of the following are true:

1. The project Models page visually reads like the supplied settings reference:
   - list-first
   - dark settings layout
   - simple provider table
   - credential configuration via modal or equally bounded lightweight editor

2. The AGChain Admin Models page visually reads as the same family of page:
   - same skeleton
   - same operator tone
   - same provider-row language
   - more administrative depth

3. A reviewer can tell at first glance:
   - project page = credentials
   - admin page = registry

4. No reviewer can mistake the admin page for a credential-entry surface.

5. No reviewer can mistake the project page for a platform model-registry editor.

6. Screenshot artifacts exist for both surfaces and their main modal/panel states.

## Acceptance Criteria

### Project Models acceptance

- provider table renders without target CRUD controls
- configure action opens credential flow only
- save/test/disconnect works from that flow
- no target management controls are visible

### AGChain Admin Models acceptance

- admin route renders a real registry surface, not placeholder text
- provider list is visible
- provider selection reveals registry detail
- target create/edit/disable controls are present
- no secret entry controls are visible anywhere on the page

### Product split acceptance

- code, UI, and docs all describe the same ownership split
- screenshots prove the split
- tests lock the split so the mixed-responsibility page does not quietly return

## Suggested File Touch Map

### Frontend

- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `web/src/components/agchain/models/AgchainModelsTable.tsx`
- `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx`
- `web/src/components/agchain/models/AgchainProjectModelKeyModal.tsx` or equivalent new modal
- `web/src/pages/admin/AgchainAdminModelsPage.tsx`
- `web/src/components/admin/...` or `web/src/components/agchain/models/admin/...` for registry controls
- `web/src/hooks/agchain/useAgchainProjectModels.ts`
- `web/src/hooks/agchain/useAgchainAdminModels.ts`
- `web/src/lib/agchainProjectModels.ts`
- `web/src/lib/agchainAdminModels.ts`

### Backend / API

- `services/platform-api/app/api/routes/agchain_models.py`
- supporting AGChain domain modules only if a lighter provider-summary contract is needed

### Docs / proof

- this plan
- updated AGChain models status / evaluation docs as needed
- screenshot artifacts under `output/playwright/` or the accepted visual proof folder

## Assumptions Used In This Plan

1. “Project page” means the normal AGChain operator-facing Models/settings surface, not the AGChain Admin route.
2. The user clarification in this thread supersedes the earlier ambiguous split in the April 3 status report.
3. The admin page should reuse the visual language of the project page, not invent a second visual system.
4. Organization-level key inheritance shown in external reference imagery is not required to land this split unless separately approved; this plan locks the immediate split around project credentials and admin registry ownership.

## Recommended Next Action

Approve this split as the governing contract, then execute in this order:

1. simplify the project page contract
2. stand up the real admin registry page
3. move target-management UI to admin
4. capture explicit visual proof for both surfaces
