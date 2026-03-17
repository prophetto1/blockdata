# Tree-Sitter Parse Track Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `tree_sitter` as a second Parse track in platform-api so uploaded code files (`.java`, `.py`, `.ts`, `.js`, `.go`, `.rs`, `.cs`) are parsed into AST + symbol-outline artifacts from the existing Parse menu.

**Architecture:** Add a new `POST /parse` route in platform-api that accepts the same simple payload the frontend already sends (`source_uid`, `profile_id`, `pipeline_config`). Platform-api looks up the document, resolves the parser track from the profile, and handles everything server-side. For tree-sitter: download source from storage → parse → upload artifacts → write DB rows → return 200. The existing `/convert` route and Docling flow are untouched. The `/parse` route uses service_role credentials (already available via `get_supabase_admin()`) to read documents, upload artifacts, and write DB rows directly — no edge function callbacks needed.

**Tech Stack:** FastAPI (platform-api), `tree-sitter` + language grammar packages, existing `app/infra/storage.py` + `app/infra/supabase_client.py`, Supabase DB (parsing_profiles, conversion_representations), React Parse workbench (Vitest).

---

## Data flow comparison

```
Docling (unchanged):
  web → edgeFetch('trigger-parse') → platform-api /convert → conversion-complete (edge fn) → DB

Tree-sitter (new):
  web → platformApiFetch('/parse', { source_uid, profile_id }) → platform-api looks up doc,
       downloads source, parses, uploads artifacts, writes DB → 200
```

The frontend sends the same shape regardless of parser — just `source_uid` + `profile_id`. Platform-api does the orchestration. Tree-sitter bypasses edge functions entirely.

---

## File inventory

### Create

| File | Purpose |
|------|---------|
| `services/platform-api/app/domain/code_parsing/__init__.py` | Package init |
| `services/platform-api/app/domain/code_parsing/models.py` | `ParseResult` Pydantic model |
| `services/platform-api/app/domain/code_parsing/language_registry.py` | Extension → tree-sitter grammar mapping |
| `services/platform-api/app/domain/code_parsing/tree_sitter_service.py` | `parse_source()` — source bytes → AST JSON + symbols JSON |
| `services/platform-api/app/domain/conversion/repository.py` | DB writes for conversion_representations and source_documents status |
| `services/platform-api/app/api/routes/parse.py` | `POST /parse` — thin orchestration route (lookup doc → resolve track → dispatch to parser → persist) |
| `services/platform-api/tests/test_tree_sitter_service.py` | Unit tests for parse_source |
| `services/platform-api/tests/test_parse_route.py` | Route integration tests for /parse endpoint |
| `services/platform-api/tests/test_conversion_repository.py` | Unit tests for repository (monkeypatched Supabase) |
| `supabase/migrations/20260317200000_098_tree_sitter_parse_track.sql` | Widen DB constraints, seed tree-sitter profiles, add extension routing |
| `web/src/components/documents/TreeSitterAstPreview.tsx` | Collapsible AST tree viewer for right pane |

### Modify

| File | Change |
|------|--------|
| `services/platform-api/requirements.txt` | Add tree-sitter + 7 language grammar packages |
| `services/platform-api/app/main.py:69` | Register `/parse` route (before plugin catch-all) |
| `web/src/components/documents/ParseTabPanel.tsx:102` | Remove `.eq('parser', 'docling')` |
| `web/src/pages/parseArtifacts.ts:17` | Widen `RepresentationType` to include `tree_sitter_ast_json`, `tree_sitter_symbols_json` |
| `web/src/pages/useParseWorkbench.tsx:683-696` | Make right-pane tabs conditional on parser track |
| `web/src/hooks/useBatchParse.ts:42` | For tree-sitter profiles, call `platformApiFetch('/parse', ...)` with simple `{ source_uid, profile_id }` payload |

### Leave alone

| File | Why |
|------|-----|
| `services/platform-api/app/api/routes/conversion.py` | Docling-only — tree-sitter does not go through /convert |
| `services/platform-api/app/domain/conversion/models.py` | ConvertRequest stays Docling-only — no widening needed |
| `supabase/functions/trigger-parse/index.ts` | Docling path — do not expand |
| `supabase/functions/conversion-complete/index.ts` | Docling callback — tree-sitter bypasses this |
| `supabase/functions/_shared/admin_policy.ts` | Edge function policy — irrelevant for tree-sitter path |
| `services/platform-api/app/workers/conversion_pool.py` | Pool is for CPU-heavy Docling — tree-sitter runs in-process |

---

## Tasks

### Task 1: Add tree-sitter dependencies and language registry

**Files:**
- Modify: `services/platform-api/requirements.txt`
- Create: `services/platform-api/app/domain/code_parsing/__init__.py`
- Create: `services/platform-api/app/domain/code_parsing/language_registry.py`

**Step 1: Add dependencies to requirements.txt**

After the `javalang>=0.13.0` line, add:

```
tree-sitter>=0.24
tree-sitter-java>=0.23
tree-sitter-python>=0.23
tree-sitter-javascript>=0.23
tree-sitter-typescript>=0.23
tree-sitter-go>=0.23
tree-sitter-rust>=0.23
tree-sitter-c-sharp>=0.23
```

**Step 2: Create the language registry**

```python
# services/platform-api/app/domain/code_parsing/__init__.py
```

```python
# services/platform-api/app/domain/code_parsing/language_registry.py
"""Map file extensions to tree-sitter Language objects (lazy-loaded)."""

from tree_sitter import Language

_GRAMMARS: dict[str, Language] = {}

EXTENSION_TO_LANG: dict[str, str] = {
    "java": "java",
    "py": "python",
    "js": "javascript",
    "jsx": "javascript",
    "ts": "typescript",
    "tsx": "tsx",
    "go": "go",
    "rs": "rust",
    "cs": "c_sharp",
}

CODE_EXTENSIONS: frozenset[str] = frozenset(EXTENSION_TO_LANG.keys())


def get_language(source_type: str) -> Language | None:
    """Return the tree-sitter Language for a file extension, or None."""
    lang_name = EXTENSION_TO_LANG.get(source_type)
    if not lang_name:
        return None
    if lang_name not in _GRAMMARS:
        mod = __import__(f"tree_sitter_{lang_name}", fromlist=["language"])
        _GRAMMARS[lang_name] = Language(mod.language())
    return _GRAMMARS[lang_name]


def is_code_extension(source_type: str) -> bool:
    return source_type in CODE_EXTENSIONS
```

**Step 3: Verify import works**

Run: `cd services/platform-api && pip install tree-sitter tree-sitter-java tree-sitter-python && python -c "from app.domain.code_parsing.language_registry import get_language; print(get_language('java'))"`

Expected: A `<Language ...>` object printed — not `None`.

**Step 4: Commit**

```bash
git add services/platform-api/requirements.txt services/platform-api/app/domain/code_parsing/
git commit -m "feat: add tree-sitter language registry"
```

---

### Task 2: Build tree-sitter parsing service

**Files:**
- Create: `services/platform-api/app/domain/code_parsing/models.py`
- Create: `services/platform-api/app/domain/code_parsing/tree_sitter_service.py`
- Create: `services/platform-api/tests/test_tree_sitter_service.py`

**Step 1: Write the failing tests**

```python
# services/platform-api/tests/test_tree_sitter_service.py
import json
import pytest
from app.domain.code_parsing.tree_sitter_service import parse_source


JAVA_SOURCE = b"""\
package demo;

public class Foo {
    private String name;

    public String getName() {
        return name;
    }
}
"""

PY_SOURCE = b"""\
class Bar:
    def __init__(self, x: int):
        self.x = x

    def value(self) -> int:
        return self.x
"""


def test_java_ast_has_root():
    result = parse_source(JAVA_SOURCE, "java")
    ast = json.loads(result.ast_json)
    assert ast["type"] == "program"
    assert len(ast["children"]) > 0


def test_java_symbols_extracted():
    result = parse_source(JAVA_SOURCE, "java")
    symbols = json.loads(result.symbols_json)
    names = [s["name"] for s in symbols]
    assert "Foo" in names
    assert "getName" in names


def test_java_symbol_kinds():
    result = parse_source(JAVA_SOURCE, "java")
    symbols = json.loads(result.symbols_json)
    by_name = {s["name"]: s for s in symbols}
    assert by_name["Foo"]["kind"] == "class"
    assert by_name["getName"]["kind"] == "method"
    assert by_name["getName"]["parent"] == "Foo"


def test_python_parses():
    result = parse_source(PY_SOURCE, "py")
    ast = json.loads(result.ast_json)
    assert ast["type"] == "module"


def test_python_symbols():
    result = parse_source(PY_SOURCE, "py")
    symbols = json.loads(result.symbols_json)
    names = [s["name"] for s in symbols]
    assert "Bar" in names
    assert "value" in names


def test_node_count_positive():
    result = parse_source(JAVA_SOURCE, "java")
    assert result.node_count > 0


def test_unsupported_type_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        parse_source(b"hello", "xyz")
```

**Step 2: Run tests to verify they fail**

Run: `cd services/platform-api && python -m pytest tests/test_tree_sitter_service.py -v`

Expected: FAIL — `ModuleNotFoundError: No module named 'app.domain.code_parsing.tree_sitter_service'`

**Step 3: Implement the service**

```python
# services/platform-api/app/domain/code_parsing/models.py
from pydantic import BaseModel


class ParseResult(BaseModel):
    ast_json: bytes
    symbols_json: bytes
    source_type: str
    language: str
    node_count: int
```

```python
# services/platform-api/app/domain/code_parsing/tree_sitter_service.py
"""Parse source code via tree-sitter into AST JSON + symbol outlines."""

import json
from tree_sitter import Parser, Node

from app.domain.code_parsing.language_registry import get_language, EXTENSION_TO_LANG
from app.domain.code_parsing.models import ParseResult

CLASS_TYPES = frozenset({
    "class_declaration", "class_definition", "interface_declaration",
    "enum_declaration", "record_declaration", "struct_declaration",
})
FUNC_TYPES = frozenset({
    "method_declaration", "function_definition", "function_declaration",
    "method_definition", "arrow_function",
})


def _node_to_dict(node: Node) -> dict:
    result = {
        "type": node.type,
        "start": list(node.start_point),
        "end": list(node.end_point),
    }
    if node.child_count == 0:
        result["text"] = node.text.decode("utf-8", errors="replace")
    else:
        result["children"] = [_node_to_dict(c) for c in node.children]
    return result


def _count_nodes(node: Node) -> int:
    return 1 + sum(_count_nodes(c) for c in node.children)


def _extract_symbols(node: Node) -> list[dict]:
    symbols: list[dict] = []

    def _walk(n: Node, parent_name: str | None = None):
        kind = None
        if n.type in CLASS_TYPES:
            kind = "class"
        elif n.type in FUNC_TYPES:
            kind = "method" if parent_name else "function"

        if kind:
            name_node = n.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "<anonymous>"
            symbols.append({
                "kind": kind,
                "name": name,
                "start_line": n.start_point[0],
                "end_line": n.end_point[0],
                "parent": parent_name,
            })
            for child in n.children:
                _walk(child, name)
        else:
            for child in n.children:
                _walk(child, parent_name)

    _walk(node)
    return symbols


def parse_source(source: bytes, source_type: str) -> ParseResult:
    """Parse source bytes into AST JSON + symbol outline JSON."""
    language = get_language(source_type)
    if language is None:
        raise ValueError(f"Unsupported source type: {source_type}")

    parser = Parser(language)
    tree = parser.parse(source)

    ast_dict = _node_to_dict(tree.root_node)
    ast_json = json.dumps(
        ast_dict, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")

    symbols = _extract_symbols(tree.root_node)
    symbols_json = json.dumps(
        symbols, ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")

    return ParseResult(
        ast_json=ast_json,
        symbols_json=symbols_json,
        source_type=source_type,
        language=EXTENSION_TO_LANG[source_type],
        node_count=_count_nodes(tree.root_node),
    )
```

**Step 4: Run tests to verify they pass**

Run: `cd services/platform-api && python -m pytest tests/test_tree_sitter_service.py -v`

Expected: All 7 tests PASS.

**Step 5: Commit**

```bash
git add services/platform-api/app/domain/code_parsing/ services/platform-api/tests/test_tree_sitter_service.py
git commit -m "feat: add tree-sitter parsing service with AST + symbol extraction"
```

---

### Task 3: Add conversion repository for direct DB writes

This module lets platform-api write `conversion_representations` and update `source_documents` status directly — the tree-sitter path does not use the `conversion-complete` edge function callback.

**Files:**
- Create: `services/platform-api/app/domain/conversion/repository.py`
- Create: `services/platform-api/tests/test_conversion_repository.py`

**Step 1: Write the failing tests**

```python
# services/platform-api/tests/test_conversion_repository.py
"""Tests for conversion repository — monkeypatches Supabase client."""
import hashlib
import pytest
from unittest.mock import MagicMock, patch

from app.domain.conversion.repository import (
    insert_representation,
    mark_source_status,
    upsert_conversion_parsing,
)


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    # Chain: client.table("x").upsert(...).execute()
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=[{"id": "test"}])
    client.table.return_value.upsert.return_value = chain
    client.table.return_value.update.return_value.eq.return_value = chain
    client.table.return_value.insert.return_value = chain
    with patch("app.domain.conversion.repository.get_supabase_admin", return_value=client):
        yield client


def test_insert_representation_writes_row(mock_supabase):
    insert_representation(
        source_uid="src-1",
        parsing_tool="tree_sitter",
        representation_type="tree_sitter_ast_json",
        artifact_locator="converted/src-1/Foo.ast.json",
        artifact_bytes=b'{"type":"program"}',
    )
    mock_supabase.table.assert_called_with("conversion_representations")
    call_args = mock_supabase.table.return_value.upsert.call_args
    row = call_args[0][0]
    assert row["source_uid"] == "src-1"
    assert row["parsing_tool"] == "tree_sitter"
    assert row["representation_type"] == "tree_sitter_ast_json"
    assert row["artifact_locator"] == "converted/src-1/Foo.ast.json"
    assert row["artifact_size_bytes"] == len(b'{"type":"program"}')
    assert len(row["artifact_hash"]) == 64  # SHA-256 hex
    assert len(row["conv_uid"]) == 64


def test_mark_source_status(mock_supabase):
    mark_source_status("src-1", "parsed")
    mock_supabase.table.assert_called_with("source_documents")


def test_upsert_conversion_parsing(mock_supabase):
    upsert_conversion_parsing(
        source_uid="src-1",
        conv_parsing_tool="tree_sitter",
        pipeline_config={"language": "java"},
        parser_runtime_meta={"node_count": 42},
    )
    mock_supabase.table.assert_called_with("conversion_parsing")
    call_args = mock_supabase.table.return_value.upsert.call_args
    row = call_args[0][0]
    assert row["conv_parsing_tool"] == "tree_sitter"
```

**Step 2: Run tests to verify they fail**

Run: `cd services/platform-api && python -m pytest tests/test_conversion_repository.py -v`

Expected: FAIL — `ModuleNotFoundError: No module named 'app.domain.conversion.repository'`

**Step 3: Implement the repository**

```python
# services/platform-api/app/domain/conversion/repository.py
"""Direct DB writes for conversion artifacts — used by tree-sitter track.

Uses the existing get_supabase_admin() singleton from app/infra/supabase_client.py.
The Docling track does NOT use this module — it persists via the
conversion-complete edge function callback.
"""

import hashlib
from typing import Any, Optional

from app.infra.supabase_client import get_supabase_admin


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _build_conv_uid(parsing_tool: str, representation_type: str, artifact_bytes: bytes) -> str:
    """Build a deterministic conv_uid matching the pattern used elsewhere."""
    digest = hashlib.sha256()
    digest.update(f"{parsing_tool}\n{representation_type}\n".encode())
    digest.update(artifact_bytes)
    return digest.hexdigest()


def insert_representation(
    source_uid: str,
    parsing_tool: str,
    representation_type: str,
    artifact_locator: str,
    artifact_bytes: bytes,
    artifact_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Insert a conversion_representations row."""
    sb = get_supabase_admin()
    sb.table("conversion_representations").upsert(
        {
            "source_uid": source_uid,
            "parsing_tool": parsing_tool,
            "representation_type": representation_type,
            "conv_uid": _build_conv_uid(parsing_tool, representation_type, artifact_bytes),
            "artifact_locator": artifact_locator,
            "artifact_hash": _sha256_hex(artifact_bytes),
            "artifact_size_bytes": len(artifact_bytes),
            "artifact_meta": artifact_meta or {},
        },
        on_conflict="source_uid,representation_type",
    ).execute()


def mark_source_status(
    source_uid: str,
    status: str,
    error: Optional[str] = None,
    conversion_job_id: Optional[str] = None,
) -> None:
    """Update source_documents.status (and optionally conversion_job_id)."""
    sb = get_supabase_admin()
    update: dict[str, Any] = {"status": status}
    if error is not None:
        update["error"] = error
    if conversion_job_id is not None:
        update["conversion_job_id"] = conversion_job_id
    sb.table("source_documents").update(update).eq("source_uid", source_uid).execute()


def upsert_conversion_parsing(
    source_uid: str,
    conv_parsing_tool: str,
    conv_status: str = "success",
    pipeline_config: Optional[dict[str, Any]] = None,
    parser_runtime_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Upsert a conversion_parsing row for the source document."""
    sb = get_supabase_admin()
    sb.table("conversion_parsing").upsert(
        {
            "source_uid": source_uid,
            "conv_parsing_tool": conv_parsing_tool,
            "conv_status": conv_status,
            "pipeline_config": pipeline_config or {},
            "parser_runtime_meta": parser_runtime_meta or {},
        },
        on_conflict="source_uid",
    ).execute()
```

**Step 4: Run tests to verify they pass**

Run: `cd services/platform-api && python -m pytest tests/test_conversion_repository.py -v`

Expected: All 3 tests PASS.

**Step 5: Commit**

```bash
git add services/platform-api/app/domain/conversion/repository.py services/platform-api/tests/test_conversion_repository.py
git commit -m "feat: add conversion repository for direct DB writes"
```

---

### Task 4: Add `/parse` orchestration route

This is the key change from the original plan. Instead of widening `/convert` and making the frontend construct complex payloads, we add a thin `/parse` route that accepts the same simple payload the frontend already sends: `{ source_uid, profile_id }`. Platform-api does all orchestration server-side.

The `/convert` route and `ConvertRequest` model stay **completely untouched** — they remain Docling-only.

**Files:**
- Create: `services/platform-api/app/api/routes/parse.py`
- Modify: `services/platform-api/app/main.py`
- Create: `services/platform-api/tests/test_parse_route.py`

**Step 1: Write the failing tests**

```python
# services/platform-api/tests/test_parse_route.py
"""Integration tests for POST /parse route."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)
AUTH_HEADERS = {"Authorization": "Bearer test-token"}


@pytest.fixture(autouse=True)
def stub_auth(monkeypatch):
    from app.auth.principals import AuthPrincipal
    principal = AuthPrincipal(
        subject_type="user", subject_id="test-user",
        roles=frozenset({"authenticated"}), auth_source="supabase_jwt",
    )
    from app.auth import dependencies
    monkeypatch.setattr(dependencies, "require_user_auth", lambda: principal)


def test_parse_route_exists():
    """POST /parse should not return 404."""
    resp = client.post("/parse", json={"source_uid": "x"}, headers=AUTH_HEADERS)
    assert resp.status_code != 404


def test_parse_rejects_missing_source_uid():
    """POST /parse requires source_uid."""
    resp = client.post("/parse", json={}, headers=AUTH_HEADERS)
    assert resp.status_code == 422


@patch("app.infra.supabase_client.get_supabase_admin")
def test_parse_rejects_unknown_source(mock_sb):
    """POST /parse returns 404 if source_uid not found."""
    mock_sb.return_value.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
    resp = client.post("/parse", json={"source_uid": "unknown"}, headers=AUTH_HEADERS)
    assert resp.status_code == 404


@patch("app.api.routes.parse.download_from_storage", new_callable=AsyncMock)
@patch("app.api.routes.parse.upload_to_storage", new_callable=AsyncMock)
@patch("app.infra.supabase_client.get_supabase_admin")
def test_parse_tree_sitter_java(mock_sb, mock_upload, mock_download):
    """Full flow: lookup doc → download → parse → upload → DB write → 200."""
    # Mock source_documents lookup
    doc_row = {"source_uid": "uid-1", "source_type": "java", "source_locator": "uploads/uid-1/Foo.java"}
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=doc_row)
    mock_sb.return_value.table.return_value.select.return_value.eq.return_value.maybe_single.return_value = chain
    # Mock DB writes
    write_chain = MagicMock()
    write_chain.execute.return_value = MagicMock(data=[])
    mock_sb.return_value.table.return_value.upsert.return_value = write_chain
    mock_sb.return_value.table.return_value.update.return_value.eq.return_value = write_chain

    mock_download.return_value = b"package demo; public class Foo { public String getName() { return null; } }"
    mock_upload.return_value = "https://storage/path"

    resp = client.post("/parse", json={"source_uid": "uid-1"}, headers=AUTH_HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("ok") is True
    assert body.get("track") == "tree_sitter"

    # Verify artifacts uploaded (AST + symbols = 2 uploads)
    assert mock_upload.call_count == 2
```

**Step 2: Run tests to verify they fail**

Run: `cd services/platform-api && python -m pytest tests/test_parse_route.py -v`

Expected: FAIL — `/parse` route does not exist.

**Step 3: Implement the /parse route**

```python
# services/platform-api/app/api/routes/parse.py
"""POST /parse — orchestration route for all parsers.

Accepts a simple { source_uid, profile_id? } payload.
Looks up the document, resolves the parser track, dispatches to the
appropriate parser, uploads artifacts, and writes DB rows.

The frontend never needs to construct download URLs, resolve source types,
or build complex payloads. That's all handled here.
"""

import os
from typing import Any, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.code_parsing.language_registry import is_code_extension
from app.domain.code_parsing.tree_sitter_service import parse_source
from app.domain.conversion.repository import (
    insert_representation,
    mark_source_status,
    upsert_conversion_parsing,
)
from app.infra.supabase_client import get_supabase_admin
from app.infra.storage import download_from_storage, upload_to_storage

router = APIRouter(tags=["parse"])

DOCUMENTS_BUCKET = os.environ.get("DOCUMENTS_BUCKET", "documents")


class ParseRequest(BaseModel):
    source_uid: str
    profile_id: Optional[str] = None
    pipeline_config: Optional[dict[str, Any]] = None


def _resolve_profile(sb, profile_id: Optional[str]) -> Optional[dict]:
    """Look up a parsing profile by ID. Returns None if not found or not provided."""
    if not profile_id:
        return None
    result = sb.table("parsing_profiles").select(
        "id, parser, config"
    ).eq("id", profile_id).maybe_single().execute()
    return result.data


@router.post("/parse")
async def parse_route(
    body: ParseRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    import uuid

    sb = get_supabase_admin()
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # 1. Look up the document
    doc = sb.table("source_documents").select(
        "source_uid, source_type, source_locator"
    ).eq("source_uid", body.source_uid).maybe_single().execute()

    if not doc.data:
        return JSONResponse(status_code=404, content={"detail": "Document not found"})

    source_type = doc.data["source_type"]
    source_locator = doc.data["source_locator"]

    # 2. Resolve profile and track
    profile = _resolve_profile(sb, body.profile_id)
    profile_config = (profile.get("config") or {}) if profile else {}
    profile_artifacts: list[str] = profile_config.get("artifacts", ["ast_json", "symbols_json"])

    if is_code_extension(source_type):
        track = "tree_sitter"
    else:
        return JSONResponse(
            status_code=400,
            content={"detail": f"No parser available for source_type '{source_type}' through /parse. Use trigger-parse for Docling formats."},
        )

    # 3. Generate a job ID (matches Docling pattern where trigger-parse creates one)
    conversion_job_id = str(uuid.uuid4())

    # 4. Tree-sitter path
    try:
        mark_source_status(body.source_uid, "converting", conversion_job_id=conversion_job_id)

        # Download source from storage (service_role — no signed URL needed)
        source_bytes = await download_from_storage(
            supabase_url, supabase_key, DOCUMENTS_BUCKET, source_locator,
        )
        result = parse_source(source_bytes, source_type)

        # Upload AST artifact (if profile includes it)
        if "ast_json" in profile_artifacts:
            ast_locator = f"converted/{body.source_uid}/{body.source_uid}.ast.json"
            await upload_to_storage(
                supabase_url, supabase_key, DOCUMENTS_BUCKET,
                ast_locator, result.ast_json, "application/json; charset=utf-8",
            )
            insert_representation(
                source_uid=body.source_uid,
                parsing_tool="tree_sitter",
                representation_type="tree_sitter_ast_json",
                artifact_locator=ast_locator,
                artifact_bytes=result.ast_json,
                artifact_meta={"language": result.language, "node_count": result.node_count},
            )

        # Upload symbols artifact (if profile includes it)
        if "symbols_json" in profile_artifacts:
            symbols_locator = f"converted/{body.source_uid}/{body.source_uid}.symbols.json"
            await upload_to_storage(
                supabase_url, supabase_key, DOCUMENTS_BUCKET,
                symbols_locator, result.symbols_json, "application/json; charset=utf-8",
            )
            insert_representation(
                source_uid=body.source_uid,
                parsing_tool="tree_sitter",
                representation_type="tree_sitter_symbols_json",
                artifact_locator=symbols_locator,
                artifact_bytes=result.symbols_json,
                artifact_meta={"language": result.language},
            )

        # Persist parsing record + mark complete
        upsert_conversion_parsing(
            source_uid=body.source_uid,
            conv_parsing_tool="tree_sitter",
            pipeline_config=body.pipeline_config or profile_config,
            parser_runtime_meta={
                "language": result.language,
                "node_count": result.node_count,
                "source_type": result.source_type,
            },
        )
        mark_source_status(body.source_uid, "parsed")

    except Exception as e:
        mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
        return JSONResponse(status_code=500, content={"detail": str(e)[:500]})

    return {"ok": True, "track": track}
```

**Step 4: Register the route in main.py**

In `services/platform-api/app/main.py`, add the parse route before the plugin catch-all (before line 83). Insert after the load_runs_router block:

```python
    # 5d. Parse orchestration (user-scoped, before plugin catch-all)
    from app.api.routes.parse import router as parse_router
    app.include_router(parse_router)
```

**Step 5: Run tests to verify they pass**

Run: `cd services/platform-api && python -m pytest tests/test_parse_route.py -v`

Expected: All 4 tests PASS.

**Step 6: Verify existing tests still pass**

Run: `cd services/platform-api && python -m pytest tests/ -v`

Expected: All PASS — Docling path completely untouched.

**Step 7: Commit**

```bash
git add services/platform-api/app/api/routes/parse.py services/platform-api/app/main.py services/platform-api/tests/test_parse_route.py
git commit -m "feat: add /parse orchestration route for tree-sitter"
```

---

### Task 6: Database migration for tree-sitter parse track

**Files:**
- Create: `supabase/migrations/20260317200000_098_tree_sitter_parse_track.sql`

**Step 1: Write the migration**

The migration must widen two constraints created in migration `081_docling_only_parsing.sql`. The exact constraint names are `conversion_representations_pairing` and `conversion_representations_v2_parsing_tool_check`.

```sql
-- Migration 098: Add tree-sitter parse track
-- Widens DB constraints to allow tree_sitter alongside docling.
-- Does NOT modify edge functions or admin_policy — tree-sitter bypasses those.

-- =========================================================================
-- 1. Widen conversion_parsing.conv_parsing_tool constraint
-- =========================================================================
-- Original constraint from migration 003 allows ('mdast', 'docling', 'pandoc').
-- Migration 081 deleted non-docling rows but did NOT alter the CHECK.
-- We must widen it to include 'tree_sitter'.

ALTER TABLE public.conversion_parsing
  DROP CONSTRAINT IF EXISTS conversion_parsing_conv_parsing_tool_check;

ALTER TABLE public.conversion_parsing
  ADD CONSTRAINT conversion_parsing_conv_parsing_tool_check
  CHECK (conv_parsing_tool IS NULL OR conv_parsing_tool IN ('mdast', 'docling', 'pandoc', 'tree_sitter'));

-- =========================================================================
-- 2. Widen conversion_representations constraints
-- =========================================================================

-- Drop the docling-only pairing constraint (from migration 081)
ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_pairing;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_pairing CHECK (
    (parsing_tool = 'docling' AND representation_type IN (
      'markdown_bytes', 'doclingdocument_json', 'html_bytes', 'doctags_text', 'citations_json'
    ))
    OR
    (parsing_tool = 'tree_sitter' AND representation_type IN (
      'tree_sitter_ast_json', 'tree_sitter_symbols_json'
    ))
  );

-- Drop the docling-only parsing_tool constraint (from migration 081)
ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_v2_parsing_tool_check;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_v2_parsing_tool_check
  CHECK (parsing_tool IN ('docling', 'tree_sitter'));

-- =========================================================================
-- 3. Seed tree-sitter parsing profiles
-- =========================================================================

INSERT INTO public.parsing_profiles (id, parser, config)
VALUES
  (gen_random_uuid(), 'tree_sitter', '{
    "name": "Tree-sitter Standard",
    "description": "Full AST + symbol outline for supported code files",
    "is_default": true,
    "artifacts": ["ast_json", "symbols_json"]
  }'::jsonb),
  (gen_random_uuid(), 'tree_sitter', '{
    "name": "Symbols Only",
    "description": "Symbol outline without full AST — smaller artifacts",
    "is_default": false,
    "artifacts": ["symbols_json"]
  }'::jsonb)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 4. Add code extensions to allowed uploads (but NOT to extension_track_routing)
-- =========================================================================
-- Note: Do NOT add code extensions to upload.extension_track_routing.
-- That table is read by trigger-parse, which would try to route tree_sitter
-- through /convert (which doesn't handle it). The /parse route resolves
-- tracks internally via is_code_extension(). We only need the extensions
-- permitted for upload.

UPDATE public.admin_runtime_policy
SET value_jsonb = value_jsonb || '["java","py","js","jsx","ts","tsx","go","rs","cs"]'::jsonb,
    updated_at = now()
WHERE policy_key = 'upload.allowed_extensions';
```

**Step 2: Verify locally**

Run: `npx supabase migration up` or apply via Supabase dashboard.

Then verify: `npx supabase db exec "SELECT parser, config->>'name' FROM parsing_profiles WHERE parser = 'tree_sitter'"`

Expected: Two rows — "Tree-sitter Standard" and "Symbols Only".

**Step 3: Commit**

```bash
git add supabase/migrations/20260317200000_098_tree_sitter_parse_track.sql
git commit -m "feat: add tree-sitter DB constraints and parsing profiles"
```

---

### Task 7: Make Parse UI parser-aware

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx:102`
- Modify: `web/src/pages/parseArtifacts.ts:17`
- Modify: `web/src/pages/useParseWorkbench.tsx:683-696`
- Modify: `web/src/hooks/useBatchParse.ts:42`

**Step 1: Remove docling-only profile filter**

In `web/src/components/documents/ParseTabPanel.tsx`, line 102, change:

```typescript
// BEFORE
const { data } = await supabase
  .from('parsing_profiles')
  .select('id, parser, config')
  .eq('parser', 'docling')
  .order('id');

// AFTER — load all parsers
const { data } = await supabase
  .from('parsing_profiles')
  .select('id, parser, config')
  .order('id');
```

**Step 2: Widen RepresentationType**

In `web/src/pages/parseArtifacts.ts`, line 17, change:

```typescript
// BEFORE
type RepresentationType = 'doclingdocument_json' | 'markdown_bytes' | 'html_bytes';

// AFTER
type RepresentationType =
  | 'doclingdocument_json' | 'markdown_bytes' | 'html_bytes'
  | 'tree_sitter_ast_json' | 'tree_sitter_symbols_json';
```

**Step 3: Make right-pane tabs parser-aware in useParseWorkbench.tsx**

At `web/src/pages/useParseWorkbench.tsx:683`, add tree-sitter-specific tabs and make the default panes respond to the selected profile's parser type:

```typescript
// Add after existing PARSE_TABS definition (line 683)
export const TREE_SITTER_TABS: WorkbenchTab[] = [
  { id: 'parse-compact', label: 'File List', icon: IconFileCode },
  { id: 'config', label: 'Parse Config', icon: IconSettings },
  { id: 'parse-settings', label: 'Parse Settings', icon: IconSettings },
  { id: 'ts-ast', label: 'AST', icon: IconBraces },
  { id: 'ts-symbols', label: 'Symbols', icon: IconLayoutList },
  { id: 'ts-downloads', label: 'Downloads', icon: IconDownload },
];
```

The workbench hook should swap between `PARSE_TABS` (Docling) and `TREE_SITTER_TABS` based on the selected profile's `parser` field from `useParseTab()`.

**Step 4: Make batch dispatch track-aware in useBatchParse.ts**

In `web/src/hooks/useBatchParse.ts`, the `dispatchOne` function (line 38) currently always calls `edgeFetch('trigger-parse', ...)`. For tree-sitter profiles, it should call `platformApiFetch('/parse', ...)` instead.

Add the parser type to `UseBatchParseOptions`:

```typescript
interface UseBatchParseOptions {
  profileId: string;
  pipelineConfig: Record<string, unknown>;
  parser: string; // 'docling' | 'tree_sitter'
  concurrency?: number;
}
```

Then in `dispatchOne`, branch by parser:

```typescript
if (parser === 'tree_sitter') {
  // Simple payload — platform-api handles all orchestration
  const resp = await platformApiFetch('/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_uid: sourceUid,
      profile_id: profileId,
      pipeline_config: pipelineConfig,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    if (attempt < 2 && (resp.status === 502 || resp.status === 503 || resp.status === 429)) {
      const backoff = (attempt + 1) * 3000;
      updateStatus(sourceUid, 'queued');
      await wait(backoff);
      return dispatchOne(sourceUid, attempt + 1);
    }
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }
  updateStatus(sourceUid, 'dispatched');
} else {
  // Existing Docling path — unchanged
  const resp = await edgeFetch('trigger-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_uid: sourceUid,
      profile_id: profileId,
      pipeline_config: pipelineConfig,
    }),
  });
  // ... existing error handling
}
```

The frontend sends the **same payload shape** for both parsers — `{ source_uid, profile_id, pipeline_config }`. The only difference is the destination: `platformApiFetch('/parse')` vs `edgeFetch('trigger-parse')`. No signed URLs, no source_type resolution, no ConvertRequest construction on the client.

The `parser` field comes from the selected profile's `parser` property (already available from the `useParseTab()` hook — it loads profiles with their `parser` field from the DB).

**Step 5: Run frontend tests**

Run: `cd web && npm run test -- src/pages/useParseWorkbench.test.tsx src/components/documents/ParseTabPanel.test.tsx`

Expected: PASS (or update existing test expectations to not assume docling-only).

**Step 6: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx web/src/pages/parseArtifacts.ts web/src/pages/useParseWorkbench.tsx web/src/hooks/useBatchParse.ts
git commit -m "feat: make Parse UI parser-aware for tree-sitter track"
```

---

### Task 8: Build AST preview component

**Files:**
- Create: `web/src/components/documents/TreeSitterAstPreview.tsx`
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Create the AST viewer component**

A collapsible tree that renders tree-sitter AST JSON. Each node shows its `type` and line range. Leaf nodes also show `text`. The component receives artifact JSON as a string prop.

```tsx
// web/src/components/documents/TreeSitterAstPreview.tsx
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type AstNode = {
  type: string;
  start: [number, number];
  end: [number, number];
  text?: string;
  children?: AstNode[];
};

function AstNodeRow({ node, depth }: { node: AstNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const lineRange = `L${node.start[0] + 1}–${node.end[0] + 1}`;

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 py-0.5 text-xs font-mono w-full text-left',
          hasChildren ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
        )}
      >
        {hasChildren && (
          <span className="w-3 text-center text-muted-foreground">
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="font-semibold text-foreground">{node.type}</span>
        <span className="text-muted-foreground">{lineRange}</span>
        {node.text && (
          <span className="ml-2 truncate text-muted-foreground/70 max-w-[200px]">
            "{node.text}"
          </span>
        )}
      </button>
      {expanded && node.children?.map((child, i) => (
        <AstNodeRow key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TreeSitterAstPreview({ jsonText }: { jsonText: string }) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(jsonText) as AstNode;
    } catch {
      return null;
    }
  }, [jsonText]);

  if (!parsed) {
    return <div className="p-4 text-xs text-muted-foreground">Invalid AST JSON</div>;
  }

  return (
    <div className="overflow-auto p-2">
      <AstNodeRow node={parsed} depth={0} />
    </div>
  );
}
```

**Step 2: Wire it into the Parse workbench**

In `useParseWorkbench.tsx`, when the active tab is `ts-ast` and a tree-sitter-parsed document is selected, load the `tree_sitter_ast_json` artifact from `conversion_representations` via signed URL and render it in `TreeSitterAstPreview`.

For the symbols tab (`ts-symbols`), render the symbols JSON as a flat table of `kind | name | lines | parent`.

**Step 3: Verify manually**

Upload a `.java` file, parse it with tree-sitter profile, check AST tab renders a collapsible tree.

**Step 4: Commit**

```bash
git add web/src/components/documents/TreeSitterAstPreview.tsx web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add AST preview component for tree-sitter track"
```

---

### Task 9: End-to-end verification

**Step 1: Run all backend tests**

```bash
cd services/platform-api && python -m pytest tests/ -v
```

Expected: All PASS.

**Step 2: Run all frontend tests**

```bash
cd web && npm run test
```

Expected: All PASS.

**Step 3: Manual verification checklist**

- [ ] Upload a `.java` file → appears in Parse file list
- [ ] Tree-sitter profile appears in profile dropdown (alongside Docling profiles)
- [ ] Select tree-sitter profile → config shows tree-sitter options
- [ ] Hit Parse → status goes to `converting` → `parsed`
- [ ] AST tab shows collapsible tree of Java syntax nodes
- [ ] Symbols tab shows classes and methods with line numbers
- [ ] Upload a `.pdf` file → Docling path still works unchanged
- [ ] Upload a `.py` file → parses with tree-sitter, symbols extracted

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify tree-sitter parse track end-to-end"
```

---

## Scope

**In scope for v1:**
- 9 code extensions: `java`, `py`, `js`, `jsx`, `ts`, `tsx`, `go`, `rs`, `cs`
- 2 artifact types: AST JSON, symbols JSON
- 2 parsing profiles: Standard (AST + symbols), Symbols-Only
- Parser-aware preview tabs in existing Parse workbench
- Direct DB persistence from platform-api (no edge function callback)

**Out of scope:**
- Non-code formats (`json`, `yaml`, `xml`) — no meaningful symbols
- Source map artifacts — no use case yet
- AST editing or semantic cross-file graph
- Docling migration to direct DB writes (leave callback flow as-is)
- Changes to `trigger-parse` or `conversion-complete` edge functions

## Notes for the implementing engineer

- **Do not create `app/infra/supabase_admin.py`** — use existing `get_supabase_admin()` from `app/infra/supabase_client.py`.
- **Do not create `app/infra/storage_client.py`** — use existing `upload_to_storage()` and `download_from_storage()` from `app/infra/storage.py`.
- **Do not modify `conversion.py` or `ConvertRequest`** — the `/convert` route stays Docling-only. Tree-sitter goes through the new `/parse` route.
- **Do not modify edge functions** — tree-sitter bypasses them entirely.
- **Register `/parse` in `main.py` before the plugin catch-all** — the catch-all `/{function_name}` route must remain last.
- **The `/parse` route uses `require_user_auth`** (not `require_auth`) — parse is a user-facing operation, not M2M.
- **The Docling path is completely untouched** — no changes to `/convert`, `trigger-parse`, or `conversion-complete`.
- **tree-sitter is fast** — parsing a 1000-line Java file takes ~5ms. No pool needed. Runs synchronously in the request handler.
- **AST JSON can be large** (~500KB for a 1000-line file). Symbols JSON is always small (~5KB). The "Symbols Only" profile skips the AST upload.
- **The frontend sends the same payload shape for all parsers** — `{ source_uid, profile_id, pipeline_config }`. It only needs to know the profile's `parser` field to choose `platformApiFetch('/parse')` vs `edgeFetch('trigger-parse')`.