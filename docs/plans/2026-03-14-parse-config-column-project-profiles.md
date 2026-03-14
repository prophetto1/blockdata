# Parse Config Column With Project Docling Profiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated middle Config column to the Parse workbench, move parse controls out of the file list, and make global Docling profiles act as default templates while each project uses its own editable profile copies.

**Architecture:** Keep `parsing_profiles` as the global default template set. Add a project-scoped profile table that stores the actual profiles used by Parse for a given project. Rework the Parse workbench into three panes: file list, config column, and preview. The new config column should reuse the ELT Parse panel styling, reuse the real parse batch controls from the current Parse page, and reuse the real Docling config editing behavior from the settings editor.

**Tech Stack:** React 19, TypeScript, Supabase Postgres, Supabase Edge Functions, existing workbench components, Ark UI primitives

> **Constraint:** Per current user direction, do not add new automated tests in this change set. Use `npm run check` plus focused manual verification instead.

## Current State

- The Parse workbench currently has two panes in [`web/src/pages/useParseWorkbench.tsx`](/e:/writing-system/web/src/pages/useParseWorkbench.tsx).
- The Parse list toolbar in [`web/src/components/documents/ParseTabPanel.tsx`](/e:/writing-system/web/src/components/documents/ParseTabPanel.tsx) mixes file-list concerns with config and batch-action concerns.
- The ELT Parse pane in [`web/src/components/elt/ParseEasyPanel.tsx`](/e:/writing-system/web/src/components/elt/ParseEasyPanel.tsx) has the visual style we want, but it uses fake local state and does not load real profiles.
- The real Docling profile loading for Parse already exists in [`web/src/components/documents/ParseTabPanel.tsx`](/e:/writing-system/web/src/components/documents/ParseTabPanel.tsx).
- The real Docling profile editing behavior already exists in [`web/src/pages/settings/DoclingConfigPanel.tsx`](/e:/writing-system/web/src/pages/settings/DoclingConfigPanel.tsx).
- The current `parsing_profiles` table is global only and has no `project_id`, as defined in [`supabase/migrations/20260310120000_075_parsing_pipeline_config.sql`](/e:/writing-system/supabase/migrations/20260310120000_075_parsing_pipeline_config.sql).

## Target Outcome

The Parse workbench should become:

1. Left pane: file table only.
2. Middle pane: Parse Config column.
3. Right pane: preview/output tabs.

The middle Config column should contain:

- current document summary
- profile picker
- parse actions: `Parse All`, `Parse Selected`, `Reset`, `Reset All`, `Cancel`
- progress / status summary
- project profile editor
- save / duplicate / delete profile actions

The profiles used in this column should be project-scoped copies of the global defaults, not direct edits to the global defaults.

## Data Model Decision

Keep:

- `public.parsing_profiles` as global default templates

Add:

- `public.project_parsing_profiles` as the per-project working set

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references public.projects(id) on delete cascade`
- `base_profile_id uuid null references public.parsing_profiles(id) on delete set null`
- `parser text not null`
- `name text not null`
- `config jsonb not null default '{}'::jsonb`
- `is_default boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- unique `(project_id, parser, name)`
- partial unique index on `(project_id, parser)` where `is_default = true`

Recommended behavior:

- first Parse config load for a project seeds its project profiles from the global `parsing_profiles` defaults if none exist yet
- later edits only touch `project_parsing_profiles`
- `base_profile_id` enables “reset to default” later without losing the link to the original template

## Task 1: Add Project-Scoped Profile Storage

**Files:**
- Create: [`supabase/migrations/20260314xxxxxx_project_parsing_profiles.sql`](/e:/writing-system/supabase/migrations)

**Step 1: Create `project_parsing_profiles`**

Add the new table, indexes, and constraints listed above.

**Step 2: Add updated-at behavior**

If this repo already uses a shared trigger helper for `updated_at`, use that pattern. Otherwise add the minimal trigger for this table only.

**Step 3: Add seed helper**

In the same migration, add a SQL function or RPC-friendly helper that copies global profiles from `parsing_profiles` into `project_parsing_profiles` for a project when none exist yet.

Expected behavior:

- no duplicate seeding
- all seeded rows copy `parser`, `name`, and `config`
- `base_profile_id` points at the original global profile row
- if a global row has `config.is_default = true`, the seeded row should become `is_default = true`

**Step 4: Commit**

```bash
git add supabase/migrations/20260314xxxxxx_project_parsing_profiles.sql
git commit -m "feat: add project parsing profiles"
```

## Task 2: Make Parse Requests Resolve Project Profiles

**Files:**
- Modify: [`supabase/functions/trigger-parse/index.ts`](/e:/writing-system/supabase/functions/trigger-parse/index.ts)

**Step 1: Accept a project profile identifier**

Update the request contract so Parse can send a `project_profile_id` for project-scoped runs.

**Step 2: Resolve config in the correct order**

Use this precedence:

1. explicit `pipeline_config` override
2. selected `project_parsing_profiles.config`
3. legacy global `parsing_profiles.config` if a global profile id is sent
4. empty object fallback

**Step 3: Validate ownership**

When a `project_profile_id` is supplied, verify that the selected document belongs to the same project and that the profile row belongs to that project before using it.

**Step 4: Preserve metadata**

Attach `_profile_id`, `_profile_name`, and a new `_project_profile_id` field to the config metadata used for persistence/debugging.

**Step 5: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts
git commit -m "feat: resolve parse config from project profiles"
```

## Task 3: Add Parse Profile Data Access In The Web App

**Files:**
- Create: [`web/src/lib/projectParsingProfiles.ts`](/e:/writing-system/web/src/lib/projectParsingProfiles.ts)
- Modify: [`web/src/components/documents/ParseTabPanel.tsx`](/e:/writing-system/web/src/components/documents/ParseTabPanel.tsx)

**Step 1: Create a shared data-access module**

Add helpers for:

- `ensureProjectParsingProfiles(projectId, parser)`
- `listProjectParsingProfiles(projectId, parser)`
- `updateProjectParsingProfile(id, patch)`
- `createProjectParsingProfile(projectId, parser, seed)`
- `duplicateProjectParsingProfile(id)`
- `deleteProjectParsingProfile(id)`

Keep the Supabase table access out of the view components.

**Step 2: Replace global profile loading in Parse state**

Update `useParseTab` so it loads project profiles instead of global `parsing_profiles`.

The hook should expose:

- `profiles`
- `selectedProfileId`
- `selectProfile`
- `saveProfile`
- `createProfile`
- `duplicateProfile`
- `deleteProfile`
- `editConfig`
- `setEditConfig`
- `isDirty`
- `reloadProfiles`

**Step 3: Update parse dispatch**

Change the batch parse hook input so it sends `project_profile_id` instead of the current global `profile_id`.

**Step 4: Keep backward compatibility narrow**

If any older call site still uses global `profile_id`, keep temporary support in the hook and edge function until all Parse callers are moved.

**Step 5: Commit**

```bash
git add web/src/lib/projectParsingProfiles.ts web/src/components/documents/ParseTabPanel.tsx web/src/hooks/useBatchParse.ts
git commit -m "feat: load project parsing profiles in parse state"
```

## Task 4: Extract A Reusable Docling Profile Editor

**Files:**
- Create: [`web/src/components/documents/DoclingProfileEditor.tsx`](/e:/writing-system/web/src/components/documents/DoclingProfileEditor.tsx)
- Modify: [`web/src/pages/settings/DoclingConfigPanel.tsx`](/e:/writing-system/web/src/pages/settings/DoclingConfigPanel.tsx)

**Step 1: Extract the form body**

Move the reusable config editing form out of the settings page and into a shared component.

This shared component should only care about:

- `config`
- `onChange`
- optional compact mode / className

It should not load or save profiles itself.

**Step 2: Keep settings page behavior working**

Refactor `DoclingConfigPanel` to use the shared editor component without changing its existing admin/editor behavior.

**Step 3: Commit**

```bash
git add web/src/components/documents/DoclingProfileEditor.tsx web/src/pages/settings/DoclingConfigPanel.tsx
git commit -m "refactor: extract shared docling profile editor"
```

## Task 5: Build The New Parse Config Column

**Files:**
- Create: [`web/src/components/documents/ParseConfigColumn.tsx`](/e:/writing-system/web/src/components/documents/ParseConfigColumn.tsx)
- Reference: [`web/src/components/elt/ParseEasyPanel.tsx`](/e:/writing-system/web/src/components/elt/ParseEasyPanel.tsx)

**Step 1: Match the ELT config-pane look**

Use the same visual language as `ParseEasyPanel`:

- outer rounded card shell
- compact top bar
- scrollable content body
- inset bordered config sections
- compact labels and helper text
- selected-document info banner

Do not copy its fake tier model or local advanced-state approach.

**Step 2: Move batch actions into this column**

The top area of the new column should own:

- profile select
- `Parse All`
- `Parse Selected`
- `Reset`
- `Reset All`
- `Cancel`
- parsed/converting progress summary

Reuse the existing batch action logic from `ParseTabPanel` rather than re-implementing it.

**Step 3: Add project profile actions**

Add:

- `Save`
- `Duplicate`
- `New Profile`
- `Delete`

Show a compact unsaved state indicator when the profile has local changes.

**Step 4: Render the shared editor**

Render the shared Docling editor below the batch actions so the user can change the actual project profile config in-place.

**Step 5: Commit**

```bash
git add web/src/components/documents/ParseConfigColumn.tsx
git commit -m "feat: add parse config column"
```

## Task 6: Simplify The Parse List Surface

**Files:**
- Modify: [`web/src/components/documents/ParseTabPanel.tsx`](/e:/writing-system/web/src/components/documents/ParseTabPanel.tsx)

**Step 1: Remove the top toolbar from the list panel**

Keep only list-specific state and the JSON modal in `ParseTabPanel`.

The list surface should no longer own:

- profile selection
- batch parse/reset buttons
- progress bar

**Step 2: Keep row actions intact**

Per-row parse/reset/delete and artifact actions can remain with the list rows unless there is a separate redesign for row actions.

**Step 3: Rename if needed**

If the component is no longer really a “tab panel,” rename it to something closer to `ParseListPanel` and update call sites.

**Step 4: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx
git commit -m "refactor: simplify parse list surface"
```

## Task 7: Rework The Parse Workbench Into Three Panes

**Files:**
- Modify: [`web/src/pages/useParseWorkbench.tsx`](/e:/writing-system/web/src/pages/useParseWorkbench.tsx)

**Step 1: Add the middle Config pane**

Update the Parse workbench layout from two panes to three panes:

1. list
2. config
3. preview

**Step 2: Rebalance widths**

Start with a narrower list than today and give the new config pane enough room for the editor.

Suggested starting widths:

- list: `28`
- config: `28`
- preview: `44`

Tune after manual visual check.

**Step 3: Pass shared Parse state to both list and config**

The file list and config column should share the same `useParseTab` state so profile selection, batch progress, and save state stay synchronized.

**Step 4: Keep existing preview tabs**

The right pane should continue to host the existing parse outputs:

- `Docling MD`
- `Blocks`
- `DoclingJson`

**Step 5: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add config pane to parse workbench"
```

## Task 8: Clean Up Type Names And Transitional Paths

**Files:**
- Modify: [`web/src/hooks/useBatchParse.ts`](/e:/writing-system/web/src/hooks/useBatchParse.ts)
- Modify: any touched Parse workbench components

**Step 1: Make the hook naming reflect project profiles**

Rename inputs and internal variables so they clearly distinguish:

- global template profile ids
- project profile ids
- explicit pipeline overrides

Avoid leaving ambiguous `profileId` names in new code if they now mean project-scoped rows.

**Step 2: Remove obsolete ELT-style fake config concepts from Parse**

Do not carry over:

- hardcoded tiers
- fake standard/advanced mode split
- local transient advanced state blobs

**Step 3: Commit**

```bash
git add web/src/hooks/useBatchParse.ts web/src/components/documents web/src/pages/useParseWorkbench.tsx
git commit -m "refactor: clarify parse profile ownership"
```

## Task 9: Verify Manually And With Type Checks

**Files:**
- Verify touched files only

**Step 1: Run the web checks**

Run:

```powershell
cd e:\writing-system\web
npm run check
```

Expected:

- no TypeScript or lint regressions from the touched files

**Step 2: Verify Parse pane layout**

Manual checks:

- Parse workbench now shows `List | Config | Preview`
- file headers remain intact in the left pane
- middle config pane visually matches the ELT Parse card style
- right preview pane still renders all three formats

**Step 3: Verify project profile seeding**

Manual checks:

- opening Parse for a project with no project profiles seeds from global defaults once
- the seeded project set contains the expected default profile
- re-opening does not create duplicates

**Step 4: Verify project isolation**

Manual checks:

- editing a profile in Project A does not change the same-named profile in Project B
- editing a project profile does not mutate the global `parsing_profiles` row

**Step 5: Verify parse dispatch**

Manual checks:

- selecting a project profile and parsing a document uses that project config
- `Parse All`, `Parse Selected`, `Reset`, `Reset All`, and `Cancel` all work from the new config column
- the file list no longer shows those controls at the top

**Step 6: Commit final integration**

```bash
git add supabase/functions/trigger-parse/index.ts supabase/migrations web/src/components/documents web/src/hooks/useBatchParse.ts web/src/lib/projectParsingProfiles.ts web/src/pages/settings/DoclingConfigPanel.tsx web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add parse config column with project docling profiles"
```

## Acceptance Criteria

- Parse workbench has three panes: list, config, preview.
- The Parse list pane retains its table headers and focuses on files only.
- The new middle config pane visually follows the ELT Parse/config pane style.
- Parse batch actions are no longer rendered at the top of the list pane.
- Global `parsing_profiles` remain default templates only.
- Each project gets its own editable Docling profile set.
- Parse dispatch resolves config from the selected project profile.
- Editing a project profile does not mutate global defaults or another project’s profiles.
- Existing Parse preview tabs still work.

## Rollback Strategy

- UI rollback: revert the Parse workbench pane split and restore the old toolbar in the list pane.
- Data rollback: keep `parsing_profiles` untouched; dropping `project_parsing_profiles` cleanly removes the new project-level layer if needed.
- Edge rollback: preserve temporary fallback support for legacy global `profile_id` until the web app cutover is confirmed.

Plan complete and saved to [`docs/plans/2026-03-14-parse-config-column-project-profiles.md`](/e:/writing-system/docs/plans/2026-03-14-parse-config-column-project-profiles.md).

Two execution options:

1. Subagent-Driven (this session) - I implement it here task by task.
2. Parallel Session (separate) - a fresh session follows this plan with `executing-plans`.
