# OnlyOffice ELT Workbench Integration — Handoff Document

> **Purpose:** Detailed state capture for session continuity. Created 2026-03-12 before context compaction.

---

## What We're Building

When a user clicks a `.docx` file in the ELT workbench assets panel, they see a read-only preview (existing `DocxPreview`) with an "Edit in OnlyOffice" toggle that switches to a live OnlyOffice editor — all within the same workbench tab. Platform-api acts as a storage shuttle between Supabase Storage and the OnlyOffice Document Server container.

**Master plan:** `docs/plans/2026-03-11-onlyoffice-elt-workbench-integration.md` (already updated with all security fixes)

---

## Completed Work (Phase 0 + Phase 1 + Tests)

### Files Created
| File | Purpose |
|---|---|
| `services/platform-api/app/api/routes/onlyoffice.py` | Bridge router — 4 endpoints: open, config, doc serve, callback |
| `services/platform-api/tests/test_onlyoffice.py` | 15 smoke tests — all passing (1.39s) |

### Files Modified
| File | Change |
|---|---|
| `services/platform-api/requirements.txt` | Added `PyJWT>=2.8` (line 10) |
| `services/platform-api/app/core/config.py` | Added 5 OnlyOffice settings to Settings dataclass and `from_env()` |
| `services/platform-api/app/infra/storage.py` | Added `upsert_to_storage()` function (lines 46-67) |
| `services/platform-api/app/main.py` | Mounted onlyoffice_router at position 6, bumped plugin catch-all to 7 |
| `docs/plans/2026-03-11-onlyoffice-elt-workbench-integration.md` | Updated with all security fixes from assessments |

### Security Model (Final, Assessed)

1. **Per-session signed JWTs** replace the old static `ONLYOFFICE_CALLBACK_TOKEN`. Container-facing routes (`/doc/{session_id}`, `/callback/{session_id}`) verify a short-lived JWT scoped to one session_id with 8hr TTL. The browser receives this token embedded in editor config URLs but cannot reuse it across sessions.

2. **Session owner binding**: `/open` stores `owner_id` in session metadata. `/config` re-checks `owner_id` matches the authenticated caller. A leaked session_id cannot grant access to another user's session.

3. **SSRF full-origin validation**: Callback download URL is validated against `onlyoffice_docserver_internal_url` checking **scheme + hostname + port** (not just hostname). This prevents redirecting the bridge to other local services.

4. **Optimistic concurrency (fail-closed)**: Before writing back to Supabase Storage, the callback downloads current storage content and compares its hash against the session's `content_hash`. If they differ (external modification) OR if the read fails (storage error), the save is **rejected** — no silent last-write-wins.

5. **Placeholder secret rejection**: `_require_jwt_secret()` rejects both empty string and `"my-jwt-secret-change-me"`. A deployment that forgets to set `ONLYOFFICE_JWT_SECRET` gets HTTP 500/503, not silently insecure operation.

6. **Mode constraint**: `ConfigRequest.mode` uses `Literal["edit", "view"]` — Pydantic rejects invalid values.

### Config Settings Added to `config.py`

```python
onlyoffice_jwt_secret: str = ""           # ONLYOFFICE_JWT_SECRET (placeholder rejected at runtime)
onlyoffice_storage_dir: str = ""          # ONLYOFFICE_STORAGE_DIR (default: /app/cache/onlyoffice)
onlyoffice_bridge_url: str = ""           # ONLYOFFICE_BRIDGE_URL (default: http://host.docker.internal:8000)
onlyoffice_docserver_url: str = ""        # ONLYOFFICE_DOCSERVER_URL (browser-facing, default: http://localhost:9980)
onlyoffice_docserver_internal_url: str = "" # ONLYOFFICE_DOCSERVER_INTERNAL_URL (container callback hostname, for SSRF check)
```

**Removed:** `onlyoffice_callback_token` — replaced by per-session JWTs.

### Bridge Router Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /onlyoffice/open` | Supabase JWT (require_auth) | Look up doc by source_uid, verify ownership, pull from storage to cache |
| `POST /onlyoffice/config` | Supabase JWT + session owner check | Generate signed editor config with per-session token in URLs |
| `GET /onlyoffice/doc/{session_id}` | Per-session JWT (query param) | Serve cached file to OnlyOffice container |
| `POST /onlyoffice/callback/{session_id}` | Per-session JWT (query param) | Receive save callback, concurrency check, download modified file, write back to storage |

### Test Coverage (15 tests, all passing)

**TestOpenAndConfig:**
- `test_open_returns_session_id` — happy path
- `test_open_rejects_wrong_owner` — ownership check on open
- `test_open_404_for_missing_document` — missing doc
- `test_config_returns_signed_jwt` — happy path with JWT
- `test_config_404_for_missing_session` — missing session
- `test_config_rejects_different_user` — session owner binding

**TestContainerRoutes:**
- `test_doc_serve_requires_valid_session_token` — wrong token rejected, valid accepted
- `test_session_token_scoped_to_session` — token A can't access session B
- `test_callback_writes_back_to_supabase` — full happy path with writeback
- `test_callback_rejects_wrong_host` — SSRF: wrong hostname
- `test_callback_rejects_wrong_scheme` — SSRF: wrong scheme (https vs http)
- `test_callback_rejects_wrong_port` — SSRF: correct host, wrong port
- `test_callback_rejects_on_concurrency_conflict` — storage content changed externally
- `test_callback_rejects_when_concurrency_check_fails` — storage read fails → save refused (fail-closed)

**TestPlaceholderSecretRejection:**
- `test_open_rejects_placeholder_secret` — placeholder JWT secret → 503

### Assessment History

Three assessments were written (by a separate reviewer "Codex"):

1. `docs/assessments/2026-03-12-onlyoffice-elt-workbench-integration-assessment.mdx` — Original plan review. Found critical issues: static callback token leaked to browser, no session-to-user binding after open, no concurrency strategy, no preview refresh.

2. `docs/assessments/2026-03-12-onlyoffice-batch-1-implementation-assessment.mdx` — Batch 1 code review. Found: SSRF port bypass, concurrency fails open, placeholder secret not rejected, no tests yet.

3. `docs/assessments/2026-03-12-onlyoffice-current-implementation-assessment.mdx` — Latest review. Conditional pass. Found: scheme not compared in SSRF (now fixed), tests timed out in subagent (passes locally in 1.39s), ELT layout migration issue (pre-existing, out of scope).

**All assessment findings have been addressed in the implementation.**

---

## Remaining Work (Phase 2 — Frontend)

### Task 2.1: Add Vite dev proxy for OnlyOffice API
- **File:** `web/vite.config.ts`
- **Change:** Add proxy rule in `server` block after `fs`:
```ts
proxy: {
  '/oo-api': {
    target: 'http://localhost:9980',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/oo-api/, ''),
  },
},
```
- **Why:** Lets frontend load OnlyOffice JS API without CORS issues during dev

### Task 2.2: Add OnlyOffice API type declarations
- **File:** Create `web/src/types/onlyoffice.d.ts`
- **Content:** Ambient type declarations for `DocsAPI.DocEditor` and `DocsAPI.DocEditorConfig`
- **Full code in plan** at lines 692-727

### Task 2.3: Create shared `platformApiFetch` helper
- **File:** Create `web/src/lib/platformApi.ts`
- **Key decision:** Reuse `requireAccessToken()` from `web/src/lib/edge.ts` (lines 42-55) instead of duplicating the token logic. The plan's code duplicates it — **import from edge.ts instead**.
- **What it does:** Authenticated fetch wrapper targeting `VITE_PIPELINE_WORKER_URL` with Supabase JWT

### Task 2.4: Create `useExternalScript` hook
- **File:** Create `web/src/hooks/useExternalScript.ts`
- **Bug fix needed:** The plan's code has a bug in the initial state — if `cache.has(src)` is true, it sets initial state to `'ready'`, but the cached promise could have rejected. **Always start with `'idle'` and let the effect handle resolution.**
- **Full code in plan** at lines 730-857 (fix the useState initializer)

### Task 2.5: Create `useOnlyOfficeEditor` hook
- **File:** Create `web/src/hooks/useOnlyOfficeEditor.ts`
- **What it does:** Encapsulates OnlyOffice lifecycle: session open → config fetch → editor mount/destroy
- **Consumes:** `platformApiFetch` and `useExternalScript`
- **Full code in plan** at lines 878-1015

### Task 2.6: Create `OnlyOfficeEditorPanel` component
- **File:** Create `web/src/components/documents/OnlyOfficeEditorPanel.tsx`
- **What it does:** Thin wrapper around the hook — provides DOM container, loading spinner, error state
- **Uses:** `Loader2` and `AlertCircle` from lucide-react, `ProjectDocumentRow` type
- **Full code in plan** at lines 1036-1077

### Task 2.7: Add Edit/Preview toggle to `PreviewTabPanel`
- **File:** Modify `web/src/components/documents/PreviewTabPanel.tsx`
- **This is the key integration point.** Changes needed:
  1. Add imports: `lazy`, `Suspense` from react; `IconEdit`, `IconEye` from @tabler/icons-react
  2. Lazy import `OnlyOfficeEditorPanel`
  3. Add state: `docxEditMode` (boolean) + `previewRevision` (number, for preview refresh)
  4. Reset both on doc change
  5. Replace the existing docx rendering block (lines 362-372) with toggle logic
  6. **Preview refresh fix:** When switching edit→preview, bump `previewRevision` and include it in the `DocxPreview` key to force remount/refetch
- **Full replacement code in plan** at lines 1155-1212
- **Important:** Verify `useState` is already imported (it likely is). Also verify `IconEdit`/`IconEye` are available — if not, use lucide-react equivalents (`Pencil`/`Eye`).

### Task 3.2: Manual end-to-end verification
- Run all three services, test the full edit/save/preview cycle
- Troubleshooting table in plan at lines 1624-1632

---

## Key Decisions Made

1. **Per-session JWTs instead of static callback token** — Critical security fix from first assessment
2. **`onlyoffice_docserver_internal_url`** — Separate env var for SSRF check because container hostname may differ from browser-facing URL
3. **Fail-closed concurrency** — If storage read fails during concurrency check, save is rejected
4. **Reuse `requireAccessToken` from edge.ts** — Don't duplicate token logic in platformApi.ts
5. **Preview revision counter** — Forces DocxPreview to remount and refetch after editing
6. **`useExternalScript` bug fix** — Always initialize to 'idle', not 'ready' based on cache check
7. **Session cleanup deferred** — Acknowledged as needed for production but not prioritized in this plan

---

## Docker/Infra State

- OnlyOffice Document Server: running and healthy on port 9980
  - `services/onlyoffice/docker-compose.yml` — postgres + rabbitmq + documentserver
  - `extra_hosts: host.docker.internal:host-gateway` is set
  - JWT_SECRET matches `ONLYOFFICE_JWT_SECRET` env var
- Platform-API: not currently running (start with `cd services/platform-api && ONLYOFFICE_JWT_SECRET=<real-secret> ONLYOFFICE_STORAGE_DIR=./cache/onlyoffice uvicorn app.main:app --port 8000 --reload`)

---

## How to Verify Current State

```bash
# Backend tests (should show 15 passed)
cd services/platform-api && python3 -m pytest tests/test_onlyoffice.py -v

# Check OnlyOffice container is healthy
curl -sf http://localhost:9980/healthcheck  # Expected: true

# Check routes are registered (requires running platform-api)
curl -s http://localhost:8000/openapi.json | python3 -c "import sys,json; paths=json.load(sys.stdin)['paths']; print([p for p in paths if 'onlyoffice' in p])"
```

---

## Git State

- Branch: `ubuntu`
- No commits made yet for this work (all changes are unstaged)
- Modified files:
  - `services/platform-api/requirements.txt`
  - `services/platform-api/app/core/config.py`
  - `services/platform-api/app/infra/storage.py`
  - `services/platform-api/app/main.py`
  - `docs/plans/2026-03-11-onlyoffice-elt-workbench-integration.md`
- New files:
  - `services/platform-api/app/api/routes/onlyoffice.py`
  - `services/platform-api/tests/test_onlyoffice.py`
  - `docs/plans/2026-03-12-onlyoffice-handoff.md` (this file)
- Assessment files (created by reviewer, not by us):
  - `docs/assessments/2026-03-12-onlyoffice-elt-workbench-integration-assessment.mdx`
  - `docs/assessments/2026-03-12-onlyoffice-batch-1-implementation-assessment.mdx`
  - `docs/assessments/2026-03-12-onlyoffice-current-implementation-assessment.mdx`
  - `docs/assessments/index.mdx`
