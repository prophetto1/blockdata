# Hardcoded Path Audit

Repo root: `P:/writing-system`

| Metric | Value |
| --- | ---: |
| Total paths found | 253 |
| Correct | 211 |
| Incorrect | 42 |
| Scanned files | 53 |
| Fixable | 14 |
| Unresolved | 28 |
| Changed files | 0 |

## Incorrect Paths

### `scripts/_run-pdf-smoke.ps1`

- Line 12, column 33: `docs\tests\test-pack\lorem_ipsum.pdf` -> `docs/tests/test-pack/lorem_ipsum.pdf`

### `scripts/bundle_python_dirs_to_markdown.py`

- Line 43, column 26: `output/python-dir-bundles/` -> `output/python-dir-bundles`

### `scripts/classify-catalog.mjs`

- Line 3, column 39: `./web/src/data/kestra-catalog-full.json` -> `web/src/data/kestra-catalog-full.json`

### `scripts/extract_kestra_endpoints.ps1`

- Line 3, column 70: `E:\\kestra` -> `No automatic rewrite`

### `scripts/generate_scaffolds.py`

- Line 13, column 41: `E:/KESTRA --output engine --prefix engine` -> `No automatic rewrite`
- Line 17, column 14: `E:/KESTRA-IO/plugins \\` -> `No automatic rewrite`
- Line 24, column 41: `E:/KESTRA --output engine --prefix engine --dry-run` -> `No automatic rewrite`
- Line 52, column 5: `E:/KESTRA/{module}/src/main/java/io/kestra/{package}/...` -> `No automatic rewrite`
- Line 73, column 5: `E:/KESTRA-IO/plugins/plugin-gcp/src/main/java/io/kestra/plugin/gcp/...` -> `No automatic rewrite`

### `scripts/husky/path-policy.mjs`

- Line 43, column 29: `services/platform-api/` -> `services/platform-api`

### `scripts/import-case-law-to-arango.mjs`

- Line 20, column 93: `F:\\case-law --reporters us` -> `No automatic rewrite`

### `scripts/kestra_core_dependency_closure.py`

- Line 10, column 20: `E:\writing-system\core\kestra-ref` -> `No automatic rewrite`
- Line 11, column 20: `E:\kestra\core\src\main\java` -> `No automatic rewrite`
- Line 12, column 21: `E:\kestra\model\src\main\java` -> `No automatic rewrite`
- Line 13, column 22: `E:\writing-system\output\kestra-core-dependency-closure` -> `No automatic rewrite`

### `scripts/p4-benchmark.ps1`

- Line 42, column 49: `e:\writing-system\scripts\logs\p4-baseline-result.json` -> `No automatic rewrite`
- Line 61, column 49: `e:\writing-system\scripts\logs\p4-caching-result.json` -> `No automatic rewrite`

### `scripts/parse_kestra_io.py`

- Line 2, column 24: `E:/KESTRA-IO/plugins and emit Python scaffolds` -> `No automatic rewrite`
- Line 6, column 3: `E:/KESTRA-IO/plugins/plugin-gcp/src/main/java/io/kestra/plugin/gcp/bigquery/Copy.java` -> `No automatic rewrite`
- Line 9, column 32: `E:/KESTRA) and ios types so that` -> `No automatic rewrite`
- Line 24, column 21: `E:/KESTRA` -> `No automatic rewrite`
- Line 25, column 24: `E:/KESTRA-IO/plugins` -> `No automatic rewrite`
- Line 297, column 13: `E:/KESTRA modules to build engine registry (no output generated).` -> `No automatic rewrite`
- Line 314, column 13: `E:/KESTRA-IO/plugins to find all plugin Java files.` -> `No automatic rewrite`

### `scripts/parse_kestra.py`

- Line 2, column 24: `E:/KESTRA and emit Python scaffolds` -> `No automatic rewrite`
- Line 6, column 3: `E:/KESTRA/{module}/src/main/java/io/kestra/{pkg}/{rest}.java` -> `No automatic rewrite`
- Line 23, column 21: `E:/KESTRA` -> `No automatic rewrite`

### `scripts/path-normalizer/normalize-hardcoded-paths.mjs`

- Line 477, column 45: `C:\\Users\\...` -> `No automatic rewrite`

### `scripts/path-normalizer/normalize-scripts-hardcoded-paths.mjs`

- Line 24, column 4: `scripts/logs/` -> `scripts/logs`
- Line 25, column 4: `scripts/path-normalizer/reports/` -> `scripts/path-normalizer/reports`

### `scripts/platform-api-dev-control.ps1`

- Line 16, column 42: `.codex-tmp\platform-api-dev\state.json` -> `<repo-root>codex-tmp/platform-api-dev/state.json`

### `scripts/serve-edge.sh`

- Line 5, column 5: `./scripts/serve-edge.sh` -> `scripts/serve-edge.sh`
- Line 6, column 5: `./scripts/serve-edge.sh` -> `scripts/serve-edge.sh`

### `scripts/setup-authenticated-writing-system-share.ps1`

- Line 4, column 27: `E:\writing-system` -> `No automatic rewrite`
- Line 6, column 28: `E:\writing-system\.deploy-secrets\writing-system-smb.txt` -> `No automatic rewrite`

### `scripts/start-capture-server.ps1`

- Line 5, column 32: `docs\design-layouts\logs` -> `docs/design-layouts/logs`
- Line 41, column 40: `scripts\capture-server.mjs` -> `scripts/capture-server.mjs`

### `scripts/start-platform-api.ps1`

- Line 11, column 36: `services\platform-api` -> `services/platform-api`
- Line 13, column 41: `.codex-tmp\platform-api-dev` -> `<repo-root>codex-tmp/platform-api-dev`

### `scripts/taxonomy.mjs`

- Line 2, column 39: `./web/src/data/kestra-catalog-full.json` -> `web/src/data/kestra-catalog-full.json`

### `scripts/translate_trivial_stubs.py`

- Line 40, column 19: `E:\KESTRA\core\src\... → /home/jon/kestra-repos/kestra/core/src/...` -> `No automatic rewrite`
- Line 42, column 35: `E:/KESTRA/` -> `No automatic rewrite`
