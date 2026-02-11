# Source Format Reliability Matrix

**Date:** 2026-02-11  
**Status:** Active verification matrix for ingest/conversion reliability  
**Purpose:** Single source of truth for format readiness before assistant work

---

## 1) Evidence Sources

Code-path evidence:

- Upload allowlist: `web/src/pages/Upload.tsx`
- Source-type detection + MIME mapping: `supabase/functions/ingest/storage.ts`
- Non-MD conversion request path: `supabase/functions/ingest/process-convert.ts`
- Conversion service accepted types: `services/conversion-service/app/main.py`
- Callback track handling (Docling vs mdast): `supabase/functions/conversion-complete/index.ts`
- Smoke script format support: `scripts/smoke-test-non-md.ps1`

Runtime status references:

- `docs/ongoing-tasks/0210-work-done-status-log.md`
- `docs/ongoing-tasks/0210-pdf-conversion-pipeline-failure.md`

---

## 2) Code Support Matrix (Repo State)

| Format | UI Upload Allowlist | Ingest `detectSourceType` | Conversion Request Path | Conversion Service Accepts | Expected Track | Smoke Script Branch |
|---|---|---|---|---|---|---|
| `md` | Yes | Yes | No (`process-md`) | N/A | `mdast` | Covered |
| `txt` | Yes | Yes | Yes | Yes | `mdast` fallback | Covered |
| `docx` | Yes | Yes | Yes | Yes | `docling` | Covered |
| `pdf` | Yes | Yes | Yes | Yes | `docling` | Covered |
| `pptx` | Yes | Yes | Yes | Yes | `docling` | Covered |
| `xlsx` | Yes | Yes | Yes | Yes | `docling` | Covered |
| `html` | Yes | Yes | Yes | Yes | `docling` | Covered |
| `csv` | Yes | Yes | Yes | Yes | `docling` | Covered |

Notes:

1. `process-convert.ts` creates `docling_output` for: `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`.
2. `conversion-complete` takes Docling branch when callback contains `docling_key`; otherwise it falls back to mdast.

---

## 3) Runtime Verification Matrix (Operational Truth)

Legend:

- `Verified`: observed success in runtime on specified date.
- `Unverified`: code path exists but no fresh runtime proof in current matrix run.
- `Blocked`: known failure not yet resolved in runtime.

| Format | Runtime Status | Last Noted Evidence | Required Next Check |
|---|---|---|---|
| `md` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep as control in smoke suite |
| `txt` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep as control in smoke suite |
| `docx` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep in regression suite |
| `pdf` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep in regression suite |
| `pptx` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep in regression suite |
| `xlsx` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep in regression suite |
| `html` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep in regression suite |
| `csv` | Verified (2026-02-11) | `0211-source-format-smoke-results.md` timestamp `20260211-124133` | Keep in regression suite |

---

## 4) Required Assertions Per Smoke Run

For `docling`-expected formats (`docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`):

1. `documents_v2.status = 'ingested'`
2. `immutable.conversion.conv_parsing_tool = 'docling'`
3. `immutable.conversion.conv_representation_type = 'doclingdocument_json'`
4. `immutable.block.block_locator.type = 'docling_json_pointer'`

For `mdast`-expected formats (`md`, `txt`):

1. `documents_v2.status = 'ingested'`
2. `immutable.conversion.conv_parsing_tool = 'mdast'`
3. `immutable.conversion.conv_representation_type = 'markdown_bytes'`
4. `immutable.block.block_locator.type = 'text_offset_range'`

---

## 5) Operational Blockers to Clear First

1. Keep committed smoke fixtures for `pptx` and `xlsx` in-repo to prevent coverage regression.
2. Ensure the matrix run remains repeatable across environments (credentials + fixture parity).
3. Keep conversion deployment/secrets checks in release checklist so verified status does not regress.

---

## 6) Execution Order (Core Reliability Pass)

1. Control checks: `md` and `txt`
2. Known-good docling baseline: `docx`
3. Highest-risk format: `pdf`
4. Newly expanded formats: `pptx`, `xlsx`, `html`, `csv`

After each run:

1. Record result in this matrix with exact date.
2. If failed, capture failure layer (ingest, conversion service, callback, block extraction).
3. Apply fix and rerun same format before moving forward.

---

## 7) Gate to Mark Format Work Complete

All required formats are marked `Verified` and pass their track assertions in Section 4.

Current gate state (2026-02-11):

1. `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`: verified (run timestamp `20260211-124133`).
2. Gate status: complete for required formats.

---

## 8) Runner Script

Matrix runner:

- `scripts/run-format-matrix-smoke.ps1`

Outputs:

1. Summary report: `docs/ongoing-tasks/0211-source-format-smoke-results.md`
2. Per-format logs: `scripts/logs/smoke-<format>-<timestamp>.log`

Recommended first run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/run-format-matrix-smoke.ps1"
```
