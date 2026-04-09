# AgentRegistry Frontend/Backend Surface Spec

## Purpose

Capture the visible `AgentRegistry` product surface before any borrowing or replacement decisions. This document is page-scope first, then backend-domain second.

Primary question:

- What pages and feature views does `AgentRegistry` actually expose to users?
- What backend domains exist behind those views?
- Is the visible product breadth small, medium, or broad relative to the apparent registry scope?

## Evidence Base

Frontend evidence:

- `I:\AgentRegistry\ui\app\layout.tsx`
- `I:\AgentRegistry\ui\components\navigation.tsx`
- `I:\AgentRegistry\ui\app\page.tsx`
- `I:\AgentRegistry\ui\app\deployed\page.tsx`
- `I:\AgentRegistry\ui\components\server-detail.tsx`
- `I:\AgentRegistry\ui\components\skill-detail.tsx`
- `I:\AgentRegistry\ui\components\agent-detail.tsx`
- `I:\AgentRegistry\ui\components\prompt-detail.tsx`
- `I:\AgentRegistry\ui\components\add-server-dialog.tsx`
- `I:\AgentRegistry\ui\components\add-skill-dialog.tsx`
- `I:\AgentRegistry\ui\components\add-agent-dialog.tsx`
- `I:\AgentRegistry\ui\components\add-prompt-dialog.tsx`
- `I:\AgentRegistry\ui\components\import-dialog.tsx`
- `I:\AgentRegistry\ui\components\deploy-dialog.tsx`

Backend evidence:

- `I:\AgentRegistry\internal\registry\service\service.go`
- `I:\AgentRegistry\internal\registry\service\registry_service.go`
- `I:\AgentRegistry\internal\registry\api\handlers\v0\servers.go`
- `I:\AgentRegistry\internal\registry\api\handlers\v0\skills.go`
- `I:\AgentRegistry\internal\registry\api\handlers\v0\agents.go`
- `I:\AgentRegistry\internal\registry\api\handlers\v0\prompts.go`
- `I:\AgentRegistry\internal\registry\api\handlers\v0\providers.go`
- `I:\AgentRegistry\internal\registry\api\handlers\v0\deployments.go`
- `I:\AgentRegistry\pkg\models\manifest.go`
- `I:\AgentRegistry\pkg\models\agent.go`
- `I:\AgentRegistry\pkg\models\skill.go`
- `I:\AgentRegistry\pkg\models\prompt.go`

## Top-Level Frontend Scope

The visible route surface is compact.

Top-level routes:

1. `/`
   Catalog/admin page for artifact discovery and creation
2. `/deployed`
   Deployment inventory and gateway access page

Shared shell:

- Persistent top navigation with two entries: `Catalog` and `Deployed`
- Global light/dark theme toggle
- Shared footer

Conclusion:

- The URL/page count is small
- The feature scope is broad inside those pages
- `AgentRegistry` expresses breadth through tabs, drawers, dialogs, and detail views instead of many routes

## Page Inventory

### 1. Catalog Page (`/`)

Source:

- `I:\AgentRegistry\ui\app\page.tsx`

This is the main registry workbench. It is one page with four primary catalog tabs:

1. Servers
2. Skills
3. Agents
4. Prompts

Shared capabilities on the page:

- fetch and aggregate paginated registry data for all four artifact types
- group versions by name and present the latest version as the default card
- search within the active tab
- refresh the catalog
- open add/import/deploy/detail flows without leaving the page

Global page actions:

- `Add` dropdown
  - Add Server
  - Add Skill
  - Add Agent
  - Add Prompt
- `Import` dropdown
  - Import Servers
- refresh button

#### 1a. Servers Tab

Primary list view:

- grouped server cards
- latest version shown by default
- version-count badge per grouped item

Tab-specific controls:

- search
- sort by name
- sort by stars
- sort by published date
- filter verified org
- filter verified publisher

Primary actions from list:

- open server detail sheet
- deploy server
- import servers when empty

Server detail sheet tabs:

1. Overview
2. Score
3. Packages
4. Remotes
5. Raw

Implication:

- the server surface is the richest single artifact view in the current frontend
- it combines catalog metadata, enrichment/score metadata, distribution/package metadata, remote transport metadata, and raw JSON

#### 1b. Skills Tab

Primary list view:

- grouped skill cards
- latest version by default
- version-count badge

Primary actions:

- open skill detail sheet
- add skill when empty

Skill detail sheet tabs:

1. Overview
2. Packages
3. Remotes
4. Raw

Implication:

- skills are treated as first-class registry artifacts, but with a simpler detail model than servers

#### 1c. Agents Tab

Primary list view:

- grouped agent cards
- latest version by default
- version-count badge

Primary actions:

- open agent detail sheet
- deploy agent
- add agent when empty

Agent detail sheet tabs:

1. Overview
2. Technical
3. Raw

Implication:

- agents are presented as deployable registry artifacts, not just metadata entries
- the detail surface is focused on operational/technical definition rather than package/remotes drilldowns

#### 1d. Prompts Tab

Primary list view:

- grouped prompt cards
- latest version by default
- version-count badge

Primary actions:

- open prompt detail sheet
- add prompt when empty

Prompt detail sheet tabs:

1. Overview
2. Raw

Implication:

- prompts are the lightest artifact type in the UI
- they are still first-class, versioned, inspectable resources

### 2. Deployed Page (`/deployed`)

Source:

- `I:\AgentRegistry\ui\app\deployed\page.tsx`

This page is a deployment inventory and access surface rather than a registry catalog.

Primary capabilities:

- list deployments
- auto-refresh deployments on interval
- search deployments
- filter by provider
- filter by origin
- filter by status
- remove deployment

View structure:

- header with running resource count
- gateway URL copy action
- separate sections for deployed agents and deployed MCP servers
- empty state linking back to Catalog when no resources are deployed

Agent-specific affordance:

- copy agent endpoint URL

Implication:

- deployment state is visible as a first-class top-level page
- the registry UI is not only for curation; it also covers active operational state

## Modal and Drawer Scope

The frontend uses dialogs and sheets to expand breadth without adding routes.

Dialogs:

- Import server dialog
- Add server dialog
- Add skill dialog
- Add agent dialog
- Add prompt dialog
- Deploy dialog for MCP servers
- Deploy dialog for agents
- delete/remove confirmation flows on deployment page

Drawer/sheet:

- right-side detail sheet for server, skill, agent, and prompt inspection

Important product consequence:

- much of the feature scope is hidden in overlays, not in route count
- any parity effort must inventory dialogs and detail drawers, not just pages

## Backend Domain Scope

The backend service is much broader than "MCP server catalog only."

Service domains exposed by `RegistryService`:

1. Servers
2. Agents
3. Skills
4. Prompts
5. Providers
6. Deployments
7. Semantic embeddings / search metadata
8. README retrieval for servers
9. Agent manifest dependency resolution

### Artifact APIs

Each of the four artifact domains follows a similar registry pattern:

- list
- get latest by name
- get specific version
- get all versions
- create new version
- delete version

This is explicit in:

- `I:\AgentRegistry\internal\registry\service\service.go`

### Deployment APIs

Operational surfaces include:

- list deployments
- get deployment
- create deployment
- remove deployment
- deployment logs
- cancel deployment
- deploy server
- deploy agent

This makes deployments a first-class backend concern, not an afterthought.

### Provider APIs

Provider management includes:

- list providers
- create provider
- update provider
- delete provider
- resolve deployment adapters by provider

This means deployment targets are modeled resources in their own right.

### Agent Manifest Resolution

The backend resolves agent dependencies through registry references:

- agent manifest skill refs can resolve to registry skills
- agent manifest prompt refs can resolve to registry prompts
- agent manifest MCP server refs can resolve to registry server definitions

Evidence:

- `I:\AgentRegistry\pkg\models\manifest.go`
- `I:\AgentRegistry\internal\registry\service\registry_service.go`

This is important because it means the registry is not only storing artifacts. It also composes them.

## Page Scope vs Feature Scope

The key product read is:

- page scope is narrow
- feature scope is broad

Visible page count:

- 2 main pages

Visible feature clusters inside those pages:

1. multi-artifact catalog browsing
2. search/filter/sort
3. version grouping
4. detail inspection
5. artifact creation
6. server import
7. deployment initiation
8. deployment monitoring
9. gateway access/copy flows
10. provider-aware operations

Practical interpretation:

- if we copy this direction, we should think in terms of a compact shell with deep work surfaces
- we should not estimate the product by route count alone

## Scope Summary

If someone asks "how many pages does AgentRegistry have?" the truthful answer is:

- two main visible pages
- but one of those pages is a multi-surface registry workbench with four artifact families and several overlay workflows

If someone asks "how broad is the represented product scope?" the answer is:

- broad enough to represent a real registry platform
- not just MCP server cataloging
- explicitly includes agents, skills, prompts, deployment providers, and live deployment state

## Immediate Takeaway For AGChain

The visible UI surface is smaller than the backend domain scope suggests, because `AgentRegistry` compresses breadth into:

- one catalog page
- one deployed page
- one shared shell
- several detail panes and dialogs

That compression pattern is likely the most important frontend lesson to preserve in any follow-on spec or borrowing decision.

## AGChain Control-Surface Taxonomy Note

This investigation led to an important AGChain product distinction that should not be lost:

- not every behavior-shaping surface is a "tool" in the narrow MCP/callable sense
- but some non-MCP surfaces are still user-controllable enough that they belong beside tools in the workbench

### 1. Narrow tools vs broader controllable levers

Narrow tools:

- MCP tools
- callable runtime tools
- connectors that expose callable operations
- plugins that package usable agent capabilities, often as skills + hooks

Broader controllable levers:

- system instructions
- general instruction prompts
- tool policy
- API governance / call policy
- token budget and efficiency controls
- approval policy

AGChain design note:

- system instructions and general instruction prompts should be treated as controllable behavioral levers, not as passive background context
- because they are user-authored, user-editable, swappable, and materially affect agent behavior, they are tool-like in the broad product sense even if they are not "tools" in the narrow callable sense
- plugins should be treated as a stronger packaging layer over plain skills when they force-trigger or reliably enforce behaviors
- that stronger packaging matters product-wise because predictable automation behavior can reduce the anxiety operators feel around agent autonomy

### 2. Ambient substrate vs user-controlled levers

Ambient substrate:

- memory
- persisted context
- mounted files
- retrieval/state mounts
- environment construction inputs that are imposed on the runtime rather than optionally invoked

User-controlled levers:

- tools
- connectors
- plugins
- hooks
- instructions
- policies
- token/efficiency settings

Implication for frontend shape:

- even if AGChain places context provision, tools, connectors, and instructions side-by-side in one workbench, the overall product should feel more like a runtime settings/control plane than a plain artifact catalog
- `AgentRegistry` remains a useful shell/reference, but AGChain should not collapse everything into a simple "artifact registry" mental model

### 3. Memory backend note

Current stated direction: AGChain is installing three memory types/backends.

Known memory backends:

1. `memory`
   - package: `@modelcontextprotocol/server-memory`
   - role: official Anthropic in-memory JSON graph
2. `memory-sqlite`
   - package: `mcp-memory-service` (doobidoo)
   - role: heavier SQLite + `sqlite-vec` memory service with auto-consolidation and dashboard
3. `memory-libsql`
   - package: `mcp-memory-libsql` (joleyline)
   - role: lighter `libSQL` file-backed memory with vector search

Unresolved follow-on decision:

- whether AGChain should present these purely as environment/memory backends, or also as selectable runtime resources inside the broader workbench
