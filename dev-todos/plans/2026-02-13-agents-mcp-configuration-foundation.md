# Agents + MCP Configuration Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an authenticated app surface for configuring model agents and placeholder MCP connections, with provider-specific credential flows focused on API keys (Anthropic/OpenAI/Google) plus a single self-hosted "Custom / OpenAI-compatible" pathway for open-source models.

**Architecture:** Build a configuration-first system in the app shell with two entry paths: (1) onboarding wizard for first-time setup and (2) provider-specific `Configure Agent` modals for ongoing edits. Reuse existing `user_api_keys` storage and edge functions for key lifecycle. Keep execution of agent chats and tool execution as a later phase; this plan delivers robust setup, validation, and persistence first. Runtime binding tasks are intentionally deferred to a follow-up implementation plan.

**Tech Stack:** React + Mantine (`web`), Supabase Postgres migrations, Supabase Edge Functions, existing auth/session and app shell components.

## Canonical Tracking and Rollout Constraints

1. Canonical backlog/queue tracking id for this plan is `INT-005` (`dev-todos/todos-backlog.md`, `dev-todos/todos-queue.md`).
2. This plan is **build-only foundation** for now: implementation is allowed, runtime usage remains disabled.
3. Keep `agentsConfigUI`, `mcpPlaceholderUI`, and `providerConnectionFlows` disabled by default until rollout approval.
4. Do not bind model execution/chat runtime or tool execution in this scope.
5. Existing shell route parity for `/app/integrations` is tracked separately as `INT-001` and must remain valid while this plan is behind flags.

---

## Intended Design (Primary)

1. In-app left rail includes `Agents`, `MCP`, `Commands`, and `Settings`.
2. `Agents` page shows searchable provider cards with status and `Configure`.
3. Each agent opens a provider-specific modal with:
4. Credential inputs (API key and/or provider connection, where supported).
5. Keyword alias (`/claude`, `/gpt`, `/gemini`, `/local`, etc.).
6. MCP server multi-select.
7. Model selector (provider-specific).
8. Optional mode selector where provider requires it.
9. Clear unusable-state banner until required auth is configured.
10. `MCP` page exists now as real placeholder management (catalog + connect state), even if tools are not yet wired.
11. First-time users get an onboarding wizard flow:
12. Step A: select default general agent from cards.
13. Step B: select auth method options for selected agent.
14. Step C: complete method-specific connect (API key, Vertex AI service account, or custom base URL).
15. Wizard must include back navigation at each step and a later-edit path via agent modal.
16. Default agent selection is persisted per-user and returned by the agent config API (future execution will reference this default).

## Wizard Reference (Source Images)

Use these as canonical onboarding **layout** references (labels may differ to match our provider/auth scope):
1. `dev-todos/AI-integration/blocks-team/initial setup.png` (default agent selection grid).
2. `dev-todos/AI-integration/blocks-team/initial setup2.png` (auth method choice list).
3. `dev-todos/AI-integration/blocks-team/initial setup3.png` (single-field connect step; in our scope this is Vertex service account connect or similar).

## Current Repo (Secondary Evidence)

1. Provider settings foundation already exists in `web/src/pages/Settings.tsx`.
2. Secure key storage and validation exist via `supabase/functions/user-api-keys/index.ts` and `supabase/functions/test-api-key/index.ts`.
3. `user_api_keys` table and related migrations are already present (`supabase/migrations/20260210191613_014_user_api_keys.sql` and follow-ups).
4. No current `Agents`/`MCP` app pages/routes are implemented.

## Provider Capability Matrix (v1)

Canonical provider families must match the existing platform provider ids:
1. `anthropic` (Claude):
2. `api_key` required.
3. `openai` (GPT):
4. `api_key` required.
5. `google` (Gemini):
6. Supports two **separate auth options**:
7. Option A: API key (Google AI Studio / Gemini API).
8. Option B: Vertex AI service account connect (stored as a provider connection).
9. `custom` (Open source / self-hosted):
10. `base_url` required and must be OpenAI-compatible.
11. `api_key` required in v1 (matches existing `user_api_keys` storage contract; use a dummy value if your endpoint does not enforce auth).
12. `MCP` binding:
13. Optional multi-select for all agents; empty is allowed.

**Note on Cursor:** Cursor is treated as an external agent host/client (future). It is not a backend model provider we call directly. Cursor integration is handled via MCP configuration (see "MCP Placeholder Surface" and future execution contract below).

## Data Model Changes

### Task 1: Add agent catalog + user configuration tables

**Files:**
- Create: `supabase/migrations/20260213180000_021_agents_config_foundation.sql`
- Modify: `web/src/lib/types.ts`

**Step 1: Write failing DB contract test notes**

Define expected DDL behavior:
1. `agent_catalog` contains system-defined templates.
2. `user_agent_configs` stores per-user provider config.
3. Unique constraint `(user_id, agent_slug)`.
4. JSONB for provider-specific extras.
5. Exactly one default agent per user (or none until onboarding completes).

**Step 2: Create migration with minimal schema**

Add:
1. `agent_catalog(agent_slug, display_name, provider_family, enabled, default_model, supports_api_key, supports_provider_connections, supports_mcp_bindings, supports_mode, created_at, updated_at)`.
2. `user_agent_configs(id, user_id, agent_slug, keyword, model, mode, mcp_server_ids jsonb default '[]', config_jsonb jsonb default '{}', is_ready boolean generated/stored or maintained in API, is_default boolean default false, created_at, updated_at)`.
3. Add a partial unique index enforcing one default per user:
   - `UNIQUE (user_id) WHERE is_default = true`

**Step 3: Seed catalog rows**

Seed rows for:
1. `anthropic`
2. `openai`
3. `google`
4. `custom`

**Step 4: Add RLS policies**

1. Users can only read/write their `user_agent_configs`.
2. `agent_catalog` is readable to authenticated users.

**Step 5: Update TS types**

Add row types for `AgentCatalogRow` and `UserAgentConfigRow` in `web/src/lib/types.ts`.

**Step 6: Commit**

```bash
git add supabase/migrations/20260213180000_021_agents_config_foundation.sql web/src/lib/types.ts
git commit -m "feat: add agent catalog and user agent config schema"
```

### Task 2: Add non-key auth connection table

**Files:**
- Create: `supabase/migrations/20260213181000_022_provider_connections.sql`
- Modify: `web/src/lib/types.ts`

**Step 1: Define contract**

Need credential methods beyond keys:
1. `gcp_service_account` (Vertex AI)
2. (Future) `oauth_login`
3. (Future) `bearer_token`

**Step 2: Add table**

`user_provider_connections`:
1. `user_id`
2. `provider`
3. `connection_type`
4. `status` (`connected|disconnected|error`)
5. `credential_encrypted` (nullable for OAuth references)
6. `metadata_jsonb`
7. timestamps

Unique `(user_id, provider, connection_type)`.

**Step 3: Add RLS and grants**

Mirror security posture used for `user_api_keys`.

**Step 4: Type updates + commit**

```bash
git add supabase/migrations/20260213181000_022_provider_connections.sql web/src/lib/types.ts
git commit -m "feat: add provider connection records for non-key auth"
```

## Backend API Layer

### Task 3: Agent config CRUD edge function

**Files:**
- Create: `supabase/functions/agent-config/index.ts`
- Create: `supabase/functions/agent-config/README.md`

**Step 1: Implement `GET`**

Return:
1. catalog rows
2. user agent config rows
3. merged readiness status based on key/connection requirements

**Step 2: Implement `POST/PATCH`**

Validate and upsert:
1. `keyword`
2. `model`
3. `mode`
4. `mcp_server_ids`
5. `config_jsonb`
6. `is_default` (optional; when set true, clear other defaults for the same user in the same request)

**Step 3: Implement readiness computation**

Rules:
1. `anthropic/openai` ready only with required API key.
2. `google` ready with either auth option:
3. Gemini API key, or
4. Vertex connection (`user_provider_connections` contains connected `google` + `gcp_service_account`).
5. `custom` ready only with `base_url` + API key present (v1).

**Step 4: Add tests (if edge tests framework exists)**

Add focused API behavior checks for readiness matrix.

**Step 5: Commit**

```bash
git add supabase/functions/agent-config
git commit -m "feat: add agent config edge API with readiness rules"
```

### Task 4: Provider connection API edge function (Vertex AI only in v1)

Vertex AI auth is OAuth-based and requires a server-side connect/disconnect surface. In v1 this edge function supports only the minimal Vertex service account connection type; other non-key auth methods remain deferred.

**Files:**
- Create: `supabase/functions/provider-connections/index.ts`
- Create: `supabase/functions/provider-connections/README.md`
- Modify: `supabase/functions/_shared/api_key_crypto.ts` (only if helper reuse is needed)

**Step 1: Add endpoints**

1. `POST /connect` for `provider=google` + `connection_type=gcp_service_account`.
2. `POST /disconnect`.
3. `GET /status`.

**Step 2: Secure storage**

Encrypt sensitive payload; never return full secret to client.

**Step 3: Validation**

1. Validate service account JSON shape (must include required fields like `client_email`, `private_key`, `project_id`).
2. Validate required metadata (Vertex `location`, optional `project_id` override).

**Step 4: Commit**

```bash
git add supabase/functions/provider-connections
git commit -m "feat: add provider connection API for vertex service account auth"
```

### Task 4A: Fix existing shell nav/route parity for `/app/integrations`

This is a pre-existing issue in current repo state: the shell nav points to `/app/integrations`, but no authenticated app route exists. Fix this parity before or alongside new route work so users never hit a dead internal link.

**Files:**
- Modify: `web/src/router.tsx`
- Create: `web/src/pages/Integrations.tsx` (app-shell placeholder) or equivalent app route target
- Modify: `web/src/components/shell/nav-config.ts` (only if path/label alignment is needed)

**Step 1: Add authenticated route parity**

1. Add `/app/integrations` under authenticated app routes (`AppLayout` branch).
2. Keep marketing `/integrations` route unchanged.

**Step 2: Add app-shell placeholder contract**

1. Render a minimal `Integrations` page title and "coming soon" state.
2. Ensure it is safe to ship even when deeper integration backends are not ready.

**Step 3: Guardrail**

1. Never leave a shell nav entry that points to a missing `/app/*` route.

**Step 4: Commit**

```bash
git add web/src/router.tsx web/src/components/shell/nav-config.ts web/src/pages/Integrations.tsx
git commit -m "fix: add authenticated integrations route parity placeholder"
```

## Frontend IA + Routing

### Task 5: Add app routes and left-rail entries

**Files:**
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`
- Modify: `web/src/components/shell/LeftRail.tsx` (active matching if needed)
- Create: `web/src/pages/Agents.tsx`
- Create: `web/src/pages/McpServers.tsx`
- Create: `web/src/pages/Commands.tsx`

**Step 1: Add routes**

1. `/app/agents`
2. `/app/mcp`
3. `/app/commands`

**Step 2: Add nav items in proper order (flag-aware)**

Platform section:
1. If `agentsConfigUI` is disabled, keep stable non-agent navigation (must include only working routes).
2. If `agentsConfigUI` is enabled, use:
3. `Agents`
4. `MCP`
5. `Commands`
6. `Settings`

**Step 3: Add placeholder pages**

Simple page headers + "coming soon" cards for MCP/Commands.

**Step 4: Commit**

```bash
git add web/src/router.tsx web/src/components/shell/nav-config.ts web/src/components/shell/LeftRail.tsx web/src/pages/Agents.tsx web/src/pages/McpServers.tsx web/src/pages/Commands.tsx
git commit -m "feat: add agents mcp commands routes and navigation"
```

## Agents UI (Screenshots-Aligned)

### Task 6: Build Agents page with search + provider cards

**Files:**
- Create: `web/src/components/agents/AgentCard.tsx`
- Create: `web/src/components/agents/AgentGrid.tsx`
- Create: `web/src/components/agents/useAgentConfigs.ts`
- Modify: `web/src/pages/Agents.tsx`

**Step 1: Card layout**

Each card:
1. provider icon/title
2. `/keyword`
3. readiness badge (`Configured`, `Needs setup`)
4. `Configure` action

**Step 2: Search/filter**

Text input filters by provider title/slug/keyword.

**Step 3: Data loading**

Consume `agent-config` GET and map into card view model.

**Step 4: Commit**

```bash
git add web/src/components/agents web/src/pages/Agents.tsx
git commit -m "feat: implement agents catalog page with search and status cards"
```

### Task 6A: Build onboarding wizard for first-time agent setup

**Files:**
- Create: `web/src/pages/AgentOnboarding.tsx`
- Create: `web/src/components/agents/onboarding/AgentSelectStep.tsx`
- Create: `web/src/components/agents/onboarding/AuthMethodStep.tsx`
- Create: `web/src/components/agents/onboarding/AuthConnectStep.tsx`
- Modify: `web/src/router.tsx`
- Modify: `web/src/pages/Agents.tsx`

**Step 1: Add onboarding route**

1. Add `/app/onboarding/agents` route.
2. Auto-redirect first-time users from `/app/agents` when no default configured agent exists (no `user_agent_configs` row where `is_default = true` and `is_ready = true`).

**Step 2: Implement Step A (select default general agent)**

1. Card grid with `Select` action per provider.
2. Persist selected default agent in local wizard state.

**Step 3: Implement Step B (configure auth method)**

Show method list based on provider capabilities:
1. API key.
2. Custom / self-hosted base URL (OpenAI-compatible).
3. (Google only) Vertex AI service account connect as a separate option from Gemini API key.

**Step 4: Implement Step C (method-specific connect UI)**

1. API key input + test/save.
2. Custom base URL input + API key + test/save.
3. Back links to Step B and Step A.
4. (Google only) Vertex connect: paste/upload service account JSON + location + connect action (stores `user_provider_connections`).

**Step 5: Completion behavior**

1. Set selected agent as default (persist `user_agent_configs.is_default = true`, and clear any previous default).
2. Navigate to `/app/agents` with success banner.

**Step 6: Commit**

```bash
git add web/src/pages/AgentOnboarding.tsx web/src/components/agents/onboarding web/src/router.tsx web/src/pages/Agents.tsx
git commit -m "feat: add first-time agent onboarding wizard flow"
```

### Task 7: Build configure modal framework

**Files:**
- Create: `web/src/components/agents/AgentConfigModal.tsx`
- Create: `web/src/components/agents/forms/AnthropicForm.tsx`
- Create: `web/src/components/agents/forms/OpenAiForm.tsx`
- Create: `web/src/components/agents/forms/GoogleForm.tsx`
- Create: `web/src/components/agents/forms/CustomForm.tsx`

**Step 1: Shared modal shell**

Common sections:
1. blocking warning banner if not ready
2. keyword
3. MCP servers multi-select
4. model
5. mode (optional by agent)
6. save button

**Step 2: Provider-specific fields**

1. Anthropic: API key.
2. OpenAI: API key.
3. Google: API key + external key-help link, OR Vertex AI service account connect status.
   - Toggle: `Gemini API key` vs `Vertex AI (service account)`.
   - Vertex fields: service account JSON (secret), location, optional project id override.
4. Custom: Base URL (required) + API key (required in v1).

**Step 3: Form validation**

Disable save until minimal provider rule is met.

**Step 4: Commit**

```bash
git add web/src/components/agents
git commit -m "feat: add provider-specific agent configuration modals"
```

### Task 8: Wire save/test/connect flows

**Files:**
- Modify: `web/src/components/agents/useAgentConfigs.ts`
- Modify: `web/src/components/agents/AgentConfigModal.tsx`
- Modify: `web/src/lib/edge.ts` (typed helpers if needed)

**Step 1: API key testing**

Reuse `test-api-key` for providers with key inputs.

**Step 2: Save config**

Persist keyword/model/mode/MCP selection via `agent-config`.

**Step 3: Provider connection actions**

1. Google Vertex connect/disconnect via `provider-connections`.

**Step 4: Toast + inline error UX**

Clear feedback for validation, connect success/failure, and save.

**Step 5: Commit**

```bash
git add web/src/components/agents web/src/lib/edge.ts
git commit -m "feat: wire agent modal save validation and provider connection flows"
```

## MCP Placeholder Surface

### Task 9: Build MCP page placeholder with connect state cards

**Files:**
- Modify: `web/src/pages/McpServers.tsx`
- Create: `web/src/components/mcp/McpServerCard.tsx`
- Create: `web/src/components/mcp/mcp-catalog.ts`

**Step 1: Catalog-based card grid**

Placeholder servers:
1. Context7
2. Slack
3. Linear
4. Firecrawl
5. Playwright
6. Postgres

**Step 2: Status actions**

`Configure` or `Connect` buttons with no-op placeholders for unimplemented backends.

**Step 3: Persist minimal preference (optional)**

Store selected MCP server IDs in `user_agent_configs.mcp_server_ids`.

**Step 4: Commit**

```bash
git add web/src/pages/McpServers.tsx web/src/components/mcp
git commit -m "feat: add mcp placeholder catalog and status cards"
```

## Cross-Cutting Security + UX Hardening

### Task 10: Secret handling and safety hardening

**Files:**
 - Modify: `supabase/functions/provider-connections/index.ts`
 - Modify: `supabase/functions/agent-config/index.ts`
 - Modify: `web/src/components/agents/forms/*.tsx`

**Step 1: Secret hygiene**

1. Never echo full secret in responses.
2. Mask existing values in UI.
3. Remove secrets from logs.

**Step 2: Validation and normalization**

1. Trim inputs.
2. Normalize keywords (`/keyword` compatibility).
3. Validate model identifier shape.

**Step 3: Accessibility**

1. Keyboard-focusable modal controls.
2. `aria-label`s for eye-toggle and close actions.
3. Error text linked to inputs.

**Step 4: Commit**

```bash
git add supabase/functions/provider-connections/index.ts supabase/functions/agent-config/index.ts web/src/components/agents
git commit -m "chore: harden agent credential safety validation and accessibility"
```

## Test and Verification Plan

### Task 11: Frontend tests for modal state and validation

**Files:**
- Create: `web/src/components/agents/__tests__/AgentConfigModal.test.tsx`
- Create: `web/src/components/agents/__tests__/provider-readiness.test.ts`

**Step 1: Add coverage**

1. Banner shows when unusable.
2. Save button enable/disable logic per provider.
3. Google readiness: Gemini key OR Vertex connection.
4. Custom readiness: base_url + api_key required (v1).

**Step 2: Run tests**

```bash
cd web
# NOTE: Web test runner is not yet configured in this repo.
# Either add a test framework as a prerequisite task, or defer web tests.
```

**Step 3: Commit**

```bash
git add web/src/components/agents/__tests__
git commit -m "test: cover agent modal validation and readiness state matrix"
```

### Task 12: Edge/API tests and smoke checks

**Files:**
- Create: `supabase/functions/agent-config/index.test.ts` (or project test convention)
 - Create: `supabase/functions/provider-connections/index.test.ts`
 

**Step 1: API contract checks**

1. Unauthorized blocked.
2. User scoping enforced.
3. Sensitive fields masked.
4. Readiness computed correctly.

**Step 2: Manual smoke script**

Document deterministic smoke sequence:
1. Configure Google (Gemini) with invalid key -> invalid.
2. Configure Google (Vertex) with invalid service account JSON -> error.
3. Configure Custom with base_url only -> invalid (v1).
4. Remove keys/connections -> needs setup.

**Step 3: Commit**

```bash
git add supabase/functions/agent-config supabase/functions/provider-connections
git commit -m "test: add edge function coverage for agent config and provider connections"
```

## Rollout Plan

### Task 13: Feature flags and staged release

**Files:**
- Modify: `web/src/lib/featureFlags.ts`
- Modify: `web/src/router.tsx`
- Modify: `docs/` rollout notes as needed

**Step 1: Add flags**

1. `agentsConfigUI`
2. `mcpPlaceholderUI`
3. `providerConnectionFlows`

**Step 2: Staged enablement**

1. Internal only.
2. Small user cohort.
3. General availability.

**Step 3: Commit**

```bash
git add web/src/lib/featureFlags.ts web/src/router.tsx docs
git commit -m "chore: add feature flags and rollout controls for agents and mcp surfaces"
```

## Acceptance Criteria (Definition of Done)

1. Users can open `Agents` page and configure the four v1 provider families (`anthropic`, `openai`, `google`, `custom`).
2. Readiness state is correct for each provider auth path.
3. Google supports both Gemini API key and Vertex AI service account connect; other non-key auth remains deferred.
4. MCP multi-select can be attached per agent config.
5. Secrets are encrypted server-side and never exposed in plaintext.
6. Side rail includes `Agents` and `MCP` with functioning routes.
7. Core tests pass for readiness rules and config API scope/security.
8. First-time onboarding wizard matches the 3-step pattern from `initial setup*.png` references.
9. Wizard and modal flows stay functionally consistent (same readiness rules and persisted data).
10. Default agent persists across sessions and is reflected in the `Agents` page UI.

## Open Decisions To Lock Before Implementation

1. Should `custom` explicitly require OpenAI-compatibility (recommended) or support multiple self-hosted APIs (not recommended for v1 foundation)?
2. Should `MCP` page persist global server connections per user now, or remain visual placeholder until tool execution is introduced?
3. For Google: do we label the provider as "Google (Gemini)" and surface Vertex as an advanced auth method, or make "Vertex AI" a separate agent card that still maps to `provider=google`?
