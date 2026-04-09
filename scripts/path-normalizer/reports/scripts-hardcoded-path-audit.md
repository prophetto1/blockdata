# Hardcoded Path Audit

Repo root: `E:/blockdata-agchain`

| Metric | Value |
| --- | ---: |
| Total paths found | 101 |
| Correct | 48 |
| Incorrect | 53 |
| Scanned files | 45 |
| Fixable | 37 |
| Unresolved | 16 |
| Changed files | 0 |

## Incorrect Paths

### `scripts/benchmarks/benchmark-worker-batching.ps1`

- Line 3, column 5: `.\scripts\benchmark-worker-batching.ps1` -> `scripts/benchmark-worker-batching.ps1`
- Line 367, column 13: `.\scripts\logs\worker-batching-benchmark-$timestamp.json` -> `scripts/logs/worker-batching-benchmark-$timestamp.json`

### `scripts/benchmarks/benchmark-worker-priority5-batching.ps1`

- Line 3, column 5: `.\scripts\benchmark-worker-priority5-batching.ps1` -> `scripts/benchmark-worker-priority5-batching.ps1`
- Line 390, column 22: `.\scripts\logs` -> `scripts/logs`
- Line 391, column 41: `.\scripts\logs` -> `scripts/logs`
- Line 394, column 13: `.\scripts\logs\priority5-batching-benchmark-$timestamp.json` -> `scripts/logs/priority5-batching-benchmark-$timestamp.json`

### `scripts/benchmarks/benchmark-worker-prompt-caching.ps1`

- Line 3, column 5: `.\scripts\benchmark-worker-prompt-caching.ps1` -> `scripts/benchmark-worker-prompt-caching.ps1`
- Line 320, column 13: `.\scripts\logs\prompt-caching-benchmark-$timestamp.json` -> `scripts/logs/prompt-caching-benchmark-$timestamp.json`

### `scripts/benchmarks/p4-benchmark.ps1`

- Line 42, column 49: `e:\writing-system\scripts\logs\p4-baseline-result.json` -> `No automatic rewrite`
- Line 61, column 49: `e:\writing-system\scripts\logs\p4-caching-result.json` -> `No automatic rewrite`

### `scripts/capture/start-capture-server.ps1`

- Line 5, column 32: `docs\design-layouts\logs` -> `docs/design-layouts/logs`
- Line 41, column 40: `scripts\capture\capture-server.mjs` -> `scripts/capture/capture-server.mjs`

### `scripts/infra/setup-authenticated-writing-system-share.ps1`

- Line 19, column 40: `.deploy-secrets\writing-system-smb.txt` -> `<repo-root>deploy-secrets/writing-system-smb.txt`

### `scripts/kestra/classify-catalog.mjs`

- Line 3, column 39: `./web/src/data/kestra-catalog-full.json` -> `web/src/data/kestra-catalog-full.json`

### `scripts/kestra/generate_scaffolds.py`

- Line 13, column 41: `E:/KESTRA --output engine --prefix engine` -> `No automatic rewrite`
- Line 17, column 14: `E:/KESTRA-IO/plugins \\` -> `No automatic rewrite`
- Line 24, column 41: `E:/KESTRA --output engine --prefix engine --dry-run` -> `No automatic rewrite`
- Line 52, column 5: `E:/KESTRA/{module}/src/main/java/io/kestra/{package}/...` -> `No automatic rewrite`
- Line 73, column 5: `E:/KESTRA-IO/plugins/plugin-gcp/src/main/java/io/kestra/plugin/gcp/...` -> `No automatic rewrite`

### `scripts/kestra/parse_kestra_io.py`

- Line 2, column 24: `E:/KESTRA-IO/plugins and emit Python scaffolds` -> `No automatic rewrite`
- Line 6, column 3: `E:/KESTRA-IO/plugins/plugin-gcp/src/main/java/io/kestra/plugin/gcp/bigquery/Copy.java` -> `No automatic rewrite`
- Line 9, column 32: `E:/KESTRA) and ios types so that` -> `No automatic rewrite`
- Line 306, column 13: `E:/KESTRA modules to build engine registry (no output generated).` -> `No automatic rewrite`
- Line 323, column 13: `E:/KESTRA-IO/plugins to find all plugin Java files.` -> `No automatic rewrite`

### `scripts/kestra/parse_kestra.py`

- Line 2, column 24: `E:/KESTRA and emit Python scaffolds` -> `No automatic rewrite`
- Line 6, column 3: `E:/KESTRA/{module}/src/main/java/io/kestra/{pkg}/{rest}.java` -> `No automatic rewrite`

### `scripts/kestra/taxonomy.mjs`

- Line 2, column 39: `./web/src/data/kestra-catalog-full.json` -> `web/src/data/kestra-catalog-full.json`

### `scripts/kestra/translate_trivial_stubs.py`

- Line 41, column 19: `E:\KESTRA\core\src\... → /home/jon/kestra-repos/kestra/core/src/...` -> `No automatic rewrite`

### `scripts/path-normalizer/normalize-hardcoded-paths.mjs`

- Line 477, column 45: `C:\\Users\\...` -> `No automatic rewrite`

### `scripts/path-normalizer/normalize-scripts-hardcoded-paths.mjs`

- Line 24, column 4: `scripts/logs/` -> `scripts/logs`
- Line 25, column 4: `scripts/path-normalizer/reports/` -> `scripts/path-normalizer/reports`

### `scripts/platform-api-dev-control.ps1`

- Line 16, column 42: `.codex-tmp\platform-api-dev\state.json` -> `<repo-root>codex-tmp/platform-api-dev/state.json`

### `scripts/repo-utils/bundle_python_dirs_to_markdown.py`

- Line 43, column 26: `output/python-dir-bundles/` -> `output/python-dir-bundles`

### `scripts/smoke-tests/_run-pdf-smoke.ps1`

- Line 12, column 33: `docs\tests\test-pack\lorem_ipsum.pdf` -> `docs/tests/test-pack/lorem_ipsum.pdf`

### `scripts/smoke-tests/smoke-test-gfm-blocktypes.ps1`

- Line 2, column 26: `.\scripts\smoke-test-gfm-blocktypes.ps1` -> `scripts/smoke-test-gfm-blocktypes.ps1`
- Line 62, column 14: `.\docs\tests\test-pack\gfm-smoke.md` -> `docs/tests/test-pack/gfm-smoke.md`
- Line 63, column 48: `.\docs\test-pack\gfm-smoke.md` -> `docs/test-pack/gfm-smoke.md`

### `scripts/smoke-tests/smoke-test-non-md.ps1`

- Line 105, column 18: `.\docs\tests\test-pack\lorem_ipsum.docx` -> `docs/tests/test-pack/lorem_ipsum.docx`
- Line 108, column 22: `.\\scripts\\test-non-md.txt` -> `scripts/test-non-md.txt`
- Line 254, column 16: `.\\scripts\\export-non-md-test.jsonl` -> `scripts/export-non-md-test.jsonl`

### `scripts/smoke-tests/smoke-test-schema-run.ps1`

- Line 2, column 26: `.\scripts\smoke-test-schema-run.ps1` -> `scripts/smoke-test-schema-run.ps1`
- Line 70, column 14: `.\docs\tests\test-pack\a2-v4.8-10787.docx.md` -> `docs/tests/test-pack/a2-v4.8-10787.docx.md`
- Line 71, column 48: `.\docs\tests\test-pack\sample-doc.md` -> `docs/tests/test-pack/sample-doc.md`
- Line 97, column 40: `.\docs\tests\user-defined\prose-optimizer-v1.schema.json` -> `docs/tests/user-defined/prose-optimizer-v1.schema.json`
- Line 151, column 16: `.\scripts\export-run-$run_id.jsonl` -> `scripts/export-run-$run_id.jsonl`

### `scripts/smoke-tests/smoke-test.ps1`

- Line 2, column 26: `.\scripts\smoke-test.ps1` -> `scripts/smoke-test.ps1`
- Line 128, column 14: `.\docs\tests\test-pack\sample-doc.md` -> `docs/tests/test-pack/sample-doc.md`
- Line 149, column 18: `.\scripts\test-document.md` -> `scripts/test-document.md`
- Line 201, column 16: `.\scripts\export-test.jsonl` -> `scripts/export-test.jsonl`

### `scripts/start-platform-api.ps1`

- Line 11, column 36: `services\platform-api` -> `services/platform-api`
- Line 13, column 41: `.codex-tmp\platform-api-dev` -> `<repo-root>codex-tmp/platform-api-dev`

### `scripts/supabase/serve-edge.sh`

- Line 5, column 5: `./scripts/serve-edge.sh` -> `scripts/serve-edge.sh`
- Line 6, column 5: `./scripts/serve-edge.sh` -> `scripts/serve-edge.sh`
