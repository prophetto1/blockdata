---
title: "Scripts Inventory"
description: "All files in `scripts/`. DB schema and project scope are in active flux — scripts that hardcode run IDs, reference stale table shapes, or served a one-time purpose are marked for deletion."
---# Scripts Inventory

All files in `scripts/`. DB schema and project scope are in active flux — scripts that hardcode run IDs, reference stale table shapes, or served a one-time purpose are marked for deletion.

---

## Keep

### Deployment

| Script | Purpose |
|--------|---------|
| `deploy-cloud-run-conversion-service.ps1` | Deploys document conversion service to GCP Cloud Run. Parameterized (`-ProjectId`, `-Region`). |
| `deploy-cloud-run-uppy-companion.ps1` | Deploys Uppy Companion (file upload proxy) to GCP Cloud Run. Parameterized. |
| `gcp-startup-illa.sh` | GCP VM startup script: installs Docker + ILLA CLI on Ubuntu. |

### Build

| Script | Purpose |
|--------|---------|
| `build-meta-configurator-embed.mjs` | Builds meta-configurator JSON Schema editor embed into `web/public/`. |

### Utilities

| Script | Purpose |
|--------|---------|
| `mojibake-sequence.ps1` | Fixes CP-1252/UTF-8 mojibake. Multi-pass, `-InPlace`, `-ShowMap`. |

---

## Delete

DB and scope are changing constantly for the next 2 weeks. These scripts hardcode run IDs, reference old table schemas, or are one-off artifacts that won't survive the changes.

### Smoke Tests (all 6)

| Script | Why delete |
|--------|-----------|
| `smoke-test.ps1` | Hardcodes v2 block structure assumptions; table names and shapes are shifting. |
| `smoke-test-schema-run.ps1` | Schema upload path and run contract will change with P7. |
| `smoke-test-gfm-blocktypes.ps1` | Block type catalog is DB-driven now; hardcoded type assertions will break. |
| `smoke-test-non-md.ps1` | Ingest pipeline contract will shift with scope changes. |
| `_run-pdf-smoke.ps1` | Wrapper around `smoke-test-non-md.ps1`. |
| `run-format-matrix-smoke.ps1` | Orchestrates the above smoke tests. |

### Benchmarks (all 5)

| Script | Why delete |
|--------|-----------|
| `benchmark-worker-prompt-caching.ps1` | P4 is done and shipped. Benchmark served its purpose. |
| `benchmark-worker-batching.ps1` | P5 is done and shipped. Hardcodes `conv_uid` and `schema_id`. |
| `benchmark-worker-priority5-batching.ps1` | Same — P5 variant, hardcoded IDs. |
| `p4-benchmark.ps1` | Hardcodes specific run IDs that no longer exist. |
| `p4-debug-auth.ps1` | One-off auth debugging; hardcodes credentials. |

### Data Files (all 7)

| File | Why delete |
|------|-----------|
| `export-run-d9c08172-....jsonl` | Tied to a specific old run. |
| `export-test.jsonl` | Export shape will change. |
| `export-non-md-test.jsonl` | Same. |
| `export-xlsx.jsonl` | Same. |
| `test-non-md.txt` | Input fixture for deleted smoke tests. |
| `dummy.pdf` | Input fixture for deleted smoke tests. |
| `tmp-mod-upload-*.md` / `tmp-new-upload-*.md` | Temporary upload probe artifacts from Feb 14. |

### Logs (entire `logs/` folder)

All benchmark JSON and smoke-test `.log` files are tied to old runs. Delete the whole folder.
