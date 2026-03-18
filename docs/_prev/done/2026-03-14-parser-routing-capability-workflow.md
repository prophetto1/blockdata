# Parser Routing Capability Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate parser selection by uploaded format from parser profile configuration, so Docling and Pandoc can coexist and routing decisions come from runtime policy instead of profile logic.

**Architecture:** Keep `admin_runtime_policy` as the source of truth for parser capability and format routing. Keep `parsing_profiles` as parser-specific execution config only. The ingest and parse trigger flow should normalize the uploaded file type, resolve the parser track from runtime policy, validate that the track claims the format, then load the selected parser profile for that track.

**Tech Stack:** Supabase Postgres, Supabase Edge Functions, TypeScript, React, Docling, Pandoc

---

### Task 1: Formalize runtime policy keys for parser capability and routing

**Files:**
- Modify: `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql`
- Modify: `supabase/migrations/20260313220000_081_docling_only_parsing.sql`
- Reference: `supabase/functions/_shared/admin_policy.ts`

**Step 1: Write the failing policy-shape test**

Add a test in the admin policy area that expects the runtime policy to expose:
- `upload.extension_track_routing`
- `upload.track_capability_catalog`
- `upload.track_enabled`
- `upload.parser_artifact_source_types`

The test should assert that a supported format can only route to a track that also claims that format in the capability catalog.

**Step 2: Run test to verify it fails**

Run: policy test command for the admin policy module  
Expected: FAIL if the current shape does not fully cover mixed Docling/Pandoc routing.

**Step 3: Define the canonical policy contract**

Update the migration/default seed so the canonical policy shape is:

```json
{
  "upload": {
    "extension_track_routing": {
      "pdf": "docling",
      "docx": "docling",
      "pptx": "docling",
      "xlsx": "docling",
      "html": "docling",
      "csv": "docling",
      "md": "docling",
      "rst": "pandoc",
      "latex": "pandoc"
    },
    "track_capability_catalog": {
      "tracks": {
        "docling": {
          "extensions": ["pdf", "docx", "pptx", "xlsx", "html", "md", "csv"]
        },
        "pandoc": {
          "extensions": ["rst", "latex", "odt", "epub", "rtf", "org"]
        }
      }
    }
  }
}
```

Do not hardcode the exact split above as product truth; use it as the target shape. The real extension lists should come from the intended supported-format inventory.

**Step 4: Run test to verify it passes**

Run: same policy test command  
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql supabase/migrations/20260313220000_081_docling_only_parsing.sql
git commit -m "feat: formalize parser routing runtime policy"
```

---

### Task 2: Make ingest routing fully policy-driven

**Files:**
- Modify: `supabase/functions/ingest/routing.ts`
- Modify: `supabase/functions/ingest/storage.ts`
- Test: `supabase/functions/ingest/routing.test.ts`

**Step 1: Write the failing routing tests**

Add tests for:
- a format routed to Docling
- a format routed to Pandoc
- a format present in routing but missing in capability catalog
- a disabled track

**Step 2: Run test to verify it fails**

Run: ingest routing test command  
Expected: FAIL

**Step 3: Implement minimal routing logic**

Ensure `resolveIngestRoute()`:
- normalizes filename extension to `source_type`
- checks `extension_track_routing`
- checks `track_enabled`
- checks `track_capability_catalog`
- returns `null` when the routing/capability pairing is invalid

Do not let profile selection influence routing.

**Step 4: Run test to verify it passes**

Run: ingest routing test command  
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/ingest/routing.ts supabase/functions/ingest/storage.ts supabase/functions/ingest/routing.test.ts
git commit -m "feat: enforce policy-driven ingest routing"
```

---

### Task 3: Make trigger-parse resolve parser track before profile config

**Files:**
- Modify: `supabase/functions/trigger-parse/index.ts`
- Test: `supabase/functions/trigger-parse/index.test.ts`

**Step 1: Write the failing trigger-parse tests**

Add tests for:
- source type routed to `docling` loads a Docling profile
- source type routed to `pandoc` loads a Pandoc profile
- invalid profile/parser mismatch returns a clear error
- missing route returns a clear error

**Step 2: Run test to verify it fails**

Run: trigger-parse test command  
Expected: FAIL

**Step 3: Implement minimal resolution order**

In `trigger-parse` make the order explicit:
1. load runtime policy
2. resolve track from `source_type`
3. validate track is enabled and claims the format
4. load selected profile from `parsing_profiles`
5. verify the profile belongs to the chosen parser
6. pass `track` and `pipeline_config` to the conversion service

Reject mixed cases such as:
- Docling-routed format with Pandoc profile
- Pandoc-routed format with Docling profile

**Step 4: Run test to verify it passes**

Run: trigger-parse test command  
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts supabase/functions/trigger-parse/index.test.ts
git commit -m "feat: resolve parser track before profile config"
```

---

### Task 4: Make parsing profiles explicitly parser-scoped in the UI

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx`
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`
- Modify: `web/src/pages/settings/DoclingConfigPanel.tsx`
- Modify: `web/src/pages/superuser/DoclingProfileEditor.tsx`

**Step 1: Write the failing UI/data tests**

Add focused tests that verify:
- only profiles matching the resolved parser are selectable
- parser mismatch is shown as a user-facing error
- format support is not inferred from profile names

**Step 2: Run test to verify it fails**

Run: targeted Parse/profile UI test command  
Expected: FAIL

**Step 3: Implement minimal UI changes**

Update profile loading so the UI treats profiles as parser-scoped presets:
- Docling profiles only for Docling-routed formats
- Pandoc profiles only for Pandoc-routed formats

Add a read-only display of the resolved parser track near the profile picker.

Do not let users believe changing the profile changes format support.

**Step 4: Run test to verify it passes**

Run: same targeted UI test command  
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx web/src/components/documents/ParseConfigColumn.tsx web/src/pages/settings/DoclingConfigPanel.tsx web/src/pages/superuser/DoclingProfileEditor.tsx
git commit -m "feat: scope parse profiles by parser track"
```

---

### Task 5: Add admin editing workflow for capability and routing

**Files:**
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `web/src/pages/settings/SettingsAdmin.tsx`
- Test: `supabase/functions/admin-config/index.test.ts`

**Step 1: Write the failing admin-config tests**

Add tests for:
- updating `upload.extension_track_routing`
- updating `upload.track_capability_catalog`
- rejecting routing/capability mismatches
- writing audit records

**Step 2: Run test to verify it fails**

Run: admin-config test command  
Expected: FAIL

**Step 3: Implement minimal admin workflow**

Add an admin surface that lets a superuser:
- edit parser capability by format
- edit the route for each format
- validate that every routed format is claimed by the target track
- save through `admin-config`

Do not mix this UI with parser profile editing.

**Step 4: Run test to verify it passes**

Run: same admin-config test command  
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/admin-config/index.ts supabase/functions/admin-config/index.test.ts web/src/pages/settings/SettingsAdmin.tsx
git commit -m "feat: add admin parser routing workflow"
```

---

### Task 6: Document the workflow and acceptance criteria

**Files:**
- Create: `docs/parse/2026-03-14-parser-routing-capability-workflow.md`

**Step 1: Write the documentation**

Document:
- where format support lives
- where parser routing lives
- where parser profile config lives
- the exact resolution order from upload to parse
- examples for Docling-only format, Pandoc-only format, and overlap format

**Step 2: Verify documentation matches implementation**

Check each documented step against:
- `ingest/routing.ts`
- `trigger-parse/index.ts`
- admin runtime policy keys
- profile loading UI

**Step 3: Commit**

```bash
git add docs/parse/2026-03-14-parser-routing-capability-workflow.md
git commit -m "docs: document parser routing capability workflow"
```

---

### Acceptance Criteria

- Format support is stored in `admin_runtime_policy`, not inferred from profile tables.
- Parser selection is based on uploaded format through runtime policy.
- Parser profiles are only used after parser selection is resolved.
- A profile cannot be applied to the wrong parser track.
- Admins can edit routing and capability without redeploying code.
- Routing/capability mismatches are rejected by validation.

### Verification Expectations

- Policy tests prove routing/capability consistency.
- Ingest routing tests prove correct parser selection by format.
- Trigger-parse tests prove parser-first, profile-second resolution.
- UI tests prove parser-scoped profile selection.
- Admin-config tests prove safe editing and audit writes.

### Rollback Strategy

If needed, restore the previous `admin_runtime_policy` values for:
- `upload.extension_track_routing`
- `upload.track_capability_catalog`
- `upload.track_enabled`
- `upload.parser_artifact_source_types`

This rollback should not require dropping `parsing_profiles`.
