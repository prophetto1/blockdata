# Plugin Runtime Substrate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 6 runtime gaps in ExecutionContext so that translated Kestra plugins can run end-to-end without reimplementing file I/O, serialization, temp files, and batching in every plugin.

**Architecture:** Extend ExecutionContext with download_file (with streaming), create_temp_file/cleanup via stdlib TemporaryDirectory, write_jsonl/read_jsonl using msgspec, list_files/delete_files. Upgrade render() from regex to Jinja2. Extract a shared chunked_write utility using more-itertools. All changes are in `services/platform-api/` — no migrations, no frontend, no edge functions.

**Tech Stack:** Python 3.11+, msgspec (fast JSON), more-itertools (chunking), Jinja2 (templates), existing httpx + Supabase Storage REST helpers.

**Depends on:** Load Activation (completed). No other prerequisites.

**Why this must come before plugin translation:** Without these, every translated plugin reimplements the same plumbing (file download, JSONL parsing, bulk batching). The current GCS and ArangoDB plugins each do this inline. That pattern doesn't scale to 7 MongoDB tasks, 21 JDBC variants, or 55 GCP functions.

**Dependency decisions:**
- **Storage/files:** Keep current Supabase REST helpers, add streaming download. No s3fs — we haven't committed to Supabase S3-compatible access.
- **Temp files:** `tempfile.TemporaryDirectory` (stdlib). No custom working directory management.
- **JSON serialization:** `msgspec` (~5-10x faster than stdlib json). Drop-in for encode/decode.
- **Chunking:** `more-itertools.chunked()` for in-memory batches, plus iterator/streaming design for chunked_write.
- **Templates:** Jinja2 replacing regex-based render().
- **MongoDB (downstream consumer):** `pymongo[srv]>=4.5` with native async API. Not motor.

---

## Scope

6 gaps from the runtime gap analysis, implemented as 4 tasks:

| Task | Gaps Closed | Files |
|------|------------|-------|
| 1. File I/O on ExecutionContext | download_file (with streaming), list_files, delete_files | models.py, storage.py, test |
| 2. Temp file management | create_temp_file, cleanup via TemporaryDirectory | models.py, test |
| 3. JSONL serialization + chunked write | encode_jsonl, decode_jsonl (msgspec), chunked_write (more-itertools) | new `app/infra/serialization.py`, test |
| 4. Jinja2 template rendering | upgrade render() from regex to Jinja2 | models.py, requirements.txt, test |

---

### Task 1: File I/O on ExecutionContext

**Files:**
- Modify: `services/platform-api/app/domain/plugins/models.py`
- Modify: `services/platform-api/app/infra/storage.py`
- Create: `services/platform-api/tests/infra/test_execution_context.py`

**Step 1: Add storage helpers to storage.py**

In `services/platform-api/app/infra/storage.py`, after `upsert_to_storage`, add:

```python
async def download_from_storage_stream(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
) -> httpx.Response:
    """Download from Supabase Storage as a streaming response.

    Caller must use `async for chunk in resp.aiter_bytes():` and close the client.
    For small files, use download_from_storage() instead.
    """
    client = httpx.AsyncClient()
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    resp = await client.send(
        client.build_request("GET", url, headers={"Authorization": f"Bearer {supabase_key}"}),
        stream=True,
    )
    resp.raise_for_status()
    return resp


async def list_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    prefix: str,
) -> list[dict]:
    """List files in a Supabase Storage bucket by prefix."""
    url = f"{supabase_url}/storage/v1/object/list/{bucket}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"prefix": prefix, "limit": 1000},
            headers={"Authorization": f"Bearer {supabase_key}"},
        )
        resp.raise_for_status()
    return resp.json()


async def delete_from_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    paths: list[str],
) -> None:
    """Delete files from Supabase Storage."""
    url = f"{supabase_url}/storage/v1/object/{bucket}"
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            "DELETE",
            url,
            json={"prefixes": paths},
            headers={"Authorization": f"Bearer {supabase_key}"},
        )
        resp.raise_for_status()
```

**Step 2: Add download_file, list_files, delete_files to ExecutionContext**

In `services/platform-api/app/domain/plugins/models.py`, add to the `ExecutionContext` class after `upload_file`:

```python
    async def download_file(self, uri: str) -> bytes:
        """Download artifact from a storage URI or public URL.

        Accepts Supabase public URLs, raw HTTP URLs, and bucket/path references.
        For large files, use download_file_stream() instead.
        """
        import httpx as _httpx
        if uri.startswith(("http://", "https://")):
            async with _httpx.AsyncClient() as client:
                resp = await client.get(uri, timeout=120)
                resp.raise_for_status()
            return resp.content
        from app.infra.storage import download_from_storage
        bucket, _, path = uri.partition("/")
        return await download_from_storage(
            self.supabase_url, self.supabase_key, bucket, path
        )

    async def download_file_stream(self, uri: str):
        """Download artifact as a streaming response for large files.

        Returns an httpx.Response with streaming enabled. Caller must iterate:
            async for chunk in resp.aiter_bytes():
                process(chunk)
            await resp.aclose()
        """
        import httpx as _httpx
        if uri.startswith(("http://", "https://")):
            client = _httpx.AsyncClient()
            resp = await client.send(
                client.build_request("GET", uri),
                stream=True,
            )
            resp.raise_for_status()
            return resp
        from app.infra.storage import download_from_storage_stream
        return await download_from_storage_stream(
            self.supabase_url, self.supabase_key,
            *uri.partition("/")[::2],  # bucket, path
        )

    async def list_files(self, bucket: str, prefix: str) -> list[dict]:
        """List files in a storage bucket by prefix."""
        from app.infra.storage import list_storage
        return await list_storage(
            self.supabase_url, self.supabase_key, bucket, prefix
        )

    async def delete_files(self, bucket: str, paths: list[str]) -> None:
        """Delete files from a storage bucket."""
        from app.infra.storage import delete_from_storage
        await delete_from_storage(
            self.supabase_url, self.supabase_key, bucket, paths
        )
```

**Step 3: Write tests**

Create `services/platform-api/tests/infra/test_execution_context.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.domain.plugins.models import ExecutionContext


@pytest.fixture
def ctx():
    return ExecutionContext(
        execution_id="test-1",
        user_id="user-1",
        supabase_url="https://example.supabase.co",
        supabase_key="test-key",
    )


@pytest.mark.asyncio
async def test_upload_file(ctx):
    with patch("app.infra.storage.upload_to_storage", new_callable=AsyncMock) as mock:
        mock.return_value = "https://example.supabase.co/storage/v1/object/public/bucket/path.jsonl"
        result = await ctx.upload_file("bucket", "path.jsonl", b"data")
    assert result.startswith("https://")
    mock.assert_called_once()


@pytest.mark.asyncio
async def test_download_file_from_url(ctx):
    mock_resp = MagicMock()
    mock_resp.content = b'{"row": 1}'
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await ctx.download_file("https://example.com/file.jsonl")
    assert result == b'{"row": 1}'


@pytest.mark.asyncio
async def test_download_file_from_bucket_path(ctx):
    with patch("app.infra.storage.download_from_storage", new_callable=AsyncMock) as mock:
        mock.return_value = b'{"data": true}'
        result = await ctx.download_file("pipeline/load-artifacts/run-1/file.jsonl")
    assert result == b'{"data": true}'
    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key", "pipeline", "load-artifacts/run-1/file.jsonl"
    )


@pytest.mark.asyncio
async def test_list_files(ctx):
    with patch("app.infra.storage.list_storage", new_callable=AsyncMock) as mock:
        mock.return_value = [{"name": "file1.jsonl"}, {"name": "file2.jsonl"}]
        result = await ctx.list_files("pipeline", "load-artifacts/run-1/")
    assert len(result) == 2


@pytest.mark.asyncio
async def test_delete_files(ctx):
    with patch("app.infra.storage.delete_from_storage", new_callable=AsyncMock) as mock:
        await ctx.delete_files("pipeline", ["load-artifacts/run-1/file1.jsonl"])
    mock.assert_called_once()
```

**Step 4: Commit**

```bash
git add -f services/platform-api/app/domain/plugins/models.py services/platform-api/app/infra/storage.py services/platform-api/tests/infra/test_execution_context.py
git commit -m "feat: add download_file, download_file_stream, list_files, delete_files to ExecutionContext"
```

---

### Task 2: Temp file management

**Files:**
- Modify: `services/platform-api/app/domain/plugins/models.py`
- Modify: `services/platform-api/tests/infra/test_execution_context.py`

**Step 1: Add TemporaryDirectory-based working directory to ExecutionContext**

In `services/platform-api/app/domain/plugins/models.py`, add import at the top:

```python
import tempfile
from pathlib import Path
```

Add a field and methods to `ExecutionContext` (after the existing fields):

```python
    _work_dir: tempfile.TemporaryDirectory | None = field(default=None, repr=False)

    @property
    def work_dir(self) -> Path:
        """Lazily create and return the execution's temp directory."""
        if self._work_dir is None:
            self._work_dir = tempfile.TemporaryDirectory(
                prefix=f"bd-{self.execution_id[:8]}-"
            )
        return Path(self._work_dir.name)

    def create_temp_file(self, suffix: str = ".tmp") -> Path:
        """Create a temp file in the execution's working directory.

        Returns the Path. File is empty — caller writes to it.
        Automatically cleaned up when cleanup() is called.
        """
        fd, path_str = tempfile.mkstemp(suffix=suffix, dir=self.work_dir)
        os.close(fd)
        return Path(path_str)

    def cleanup(self) -> None:
        """Delete all temp files created during this execution.

        Safe to call multiple times. Uses stdlib TemporaryDirectory.cleanup().
        """
        if self._work_dir is not None:
            self._work_dir.cleanup()
            self._work_dir = None
```

**Step 2: Add tests**

Append to `services/platform-api/tests/infra/test_execution_context.py`:

```python
def test_create_temp_file(ctx):
    path = ctx.create_temp_file(suffix=".jsonl")
    assert path.exists()
    assert path.suffix == ".jsonl"
    # Write and read back
    path.write_text('{"test": true}')
    assert path.read_text() == '{"test": true}'
    ctx.cleanup()
    assert not path.exists()


def test_work_dir_is_lazy(ctx):
    assert ctx._work_dir is None
    _ = ctx.work_dir
    assert ctx._work_dir is not None


def test_cleanup_is_idempotent(ctx):
    ctx.create_temp_file()
    ctx.cleanup()
    ctx.cleanup()  # should not raise


def test_multiple_temp_files(ctx):
    p1 = ctx.create_temp_file(suffix=".csv")
    p2 = ctx.create_temp_file(suffix=".jsonl")
    assert p1.parent == p2.parent  # same working directory
    assert p1 != p2
    ctx.cleanup()
```

**Step 3: Commit**

```bash
git add services/platform-api/app/domain/plugins/models.py services/platform-api/tests/infra/test_execution_context.py
git commit -m "feat: add temp file management to ExecutionContext via TemporaryDirectory"
```

---

### Task 3: JSONL serialization + chunked write helper

**Files:**
- Create: `services/platform-api/app/infra/serialization.py`
- Create: `services/platform-api/tests/infra/test_serialization.py`
- Modify: `services/platform-api/requirements.txt`

**Step 1: Add dependencies**

Add to `services/platform-api/requirements.txt`:

```
msgspec>=0.18
more-itertools>=10.0
```

**Step 2: Create serialization module**

Create `services/platform-api/app/infra/serialization.py`:

```python
"""Shared JSONL serialization and bulk write utilities.

Uses msgspec for fast JSON encoding/decoding (~5-10x faster than stdlib json).
Uses more-itertools for clean chunking.
JSONL is BD's equivalent of Kestra's Ion format — line-delimited JSON.
"""
from collections.abc import AsyncIterator, Iterable, Iterator
from pathlib import Path
from typing import Any, Awaitable, Callable

import msgspec
from more_itertools import chunked

_encoder = msgspec.json.Encoder()
_decoder = msgspec.json.Decoder()


def encode_jsonl(documents: Iterable[dict[str, Any]]) -> bytes:
    """Encode documents as JSONL bytes. Fast path via msgspec."""
    lines = [_encoder.encode(doc) for doc in documents]
    return b"\n".join(lines)


def decode_jsonl(data: bytes | str) -> list[dict[str, Any]]:
    """Decode JSONL bytes or string into a list of dicts."""
    raw = data.encode("utf-8") if isinstance(data, str) else data
    return [_decoder.decode(line) for line in raw.strip().split(b"\n") if line.strip()]


def iter_jsonl(data: bytes | str) -> Iterator[dict[str, Any]]:
    """Iterate JSONL lines without loading all into memory."""
    raw = data.encode("utf-8") if isinstance(data, str) else data
    for line in raw.split(b"\n"):
        line = line.strip()
        if line:
            yield _decoder.decode(line)


def encode_jsonl_to_file(documents: Iterable[dict[str, Any]], path: Path) -> int:
    """Write documents as JSONL to a file. Returns row count."""
    count = 0
    with open(path, "wb") as f:
        for doc in documents:
            f.write(_encoder.encode(doc))
            f.write(b"\n")
            count += 1
    return count


def decode_jsonl_from_file(path: Path) -> Iterator[dict[str, Any]]:
    """Stream JSONL lines from a file without loading all into memory."""
    with open(path, "rb") as f:
        for line in f:
            line = line.strip()
            if line:
                yield _decoder.decode(line)


async def chunked_write(
    documents: list[dict[str, Any]],
    writer_fn: Callable[[list[dict[str, Any]]], Awaitable[tuple[int, int]]],
    chunk_size: int = 500,
) -> dict[str, Any]:
    """Batch documents into chunks and call writer_fn per chunk.

    Uses more-itertools.chunked() for clean batching.
    writer_fn receives a list of documents and returns (inserted_count, failed_count).
    Returns aggregated totals.
    """
    total_inserted = 0
    total_failed = 0
    errors: list[str] = []

    for batch in chunked(documents, chunk_size):
        try:
            inserted, failed = await writer_fn(batch)
            total_inserted += inserted
            total_failed += failed
        except Exception as e:
            total_failed += len(batch)
            errors.append(str(e)[:200])

    return {
        "inserted": total_inserted,
        "failed": total_failed,
        "total": total_inserted + total_failed,
        "errors": errors[:10],
    }


async def chunked_write_iter(
    documents: Iterable[dict[str, Any]],
    writer_fn: Callable[[list[dict[str, Any]]], Awaitable[tuple[int, int]]],
    chunk_size: int = 500,
) -> dict[str, Any]:
    """Streaming variant of chunked_write — accepts any iterable, not just lists.

    Useful when reading from a file or generator without loading all into memory.
    """
    total_inserted = 0
    total_failed = 0
    errors: list[str] = []

    for batch in chunked(documents, chunk_size):
        try:
            inserted, failed = await writer_fn(list(batch))
            total_inserted += inserted
            total_failed += failed
        except Exception as e:
            total_failed += len(list(batch))
            errors.append(str(e)[:200])

    return {
        "inserted": total_inserted,
        "failed": total_failed,
        "total": total_inserted + total_failed,
        "errors": errors[:10],
    }
```

**Step 3: Write tests**

Create `services/platform-api/tests/infra/test_serialization.py`:

```python
import pytest
from pathlib import Path
from app.infra.serialization import (
    encode_jsonl, decode_jsonl, iter_jsonl,
    encode_jsonl_to_file, decode_jsonl_from_file,
    chunked_write, chunked_write_iter,
)


def test_encode_jsonl():
    docs = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
    result = encode_jsonl(docs)
    assert isinstance(result, bytes)
    lines = result.split(b"\n")
    assert len(lines) == 2
    assert b"Alice" in lines[0]


def test_decode_jsonl():
    data = b'{"name":"Alice"}\n{"name":"Bob"}'
    result = decode_jsonl(data)
    assert len(result) == 2
    assert result[0]["name"] == "Alice"


def test_decode_jsonl_handles_trailing_newline():
    data = b'{"a":1}\n{"b":2}\n'
    result = decode_jsonl(data)
    assert len(result) == 2


def test_encode_decode_round_trip():
    docs = [{"id": 1, "value": "test"}, {"id": 2, "value": "data"}]
    encoded = encode_jsonl(docs)
    decoded = decode_jsonl(encoded)
    assert decoded == docs


def test_iter_jsonl():
    data = b'{"a":1}\n{"b":2}\n{"c":3}'
    items = list(iter_jsonl(data))
    assert len(items) == 3
    assert items[2] == {"c": 3}


def test_encode_jsonl_to_file(tmp_path):
    docs = [{"x": i} for i in range(5)]
    path = tmp_path / "test.jsonl"
    count = encode_jsonl_to_file(docs, path)
    assert count == 5
    assert path.exists()
    # Read back
    lines = path.read_bytes().strip().split(b"\n")
    assert len(lines) == 5


def test_decode_jsonl_from_file(tmp_path):
    path = tmp_path / "test.jsonl"
    path.write_bytes(b'{"a":1}\n{"b":2}\n{"c":3}\n')
    items = list(decode_jsonl_from_file(path))
    assert len(items) == 3
    assert items[1] == {"b": 2}


def test_file_round_trip(tmp_path):
    docs = [{"id": i, "val": f"row-{i}"} for i in range(100)]
    path = tmp_path / "round.jsonl"
    encode_jsonl_to_file(docs, path)
    decoded = list(decode_jsonl_from_file(path))
    assert decoded == docs


@pytest.mark.asyncio
async def test_chunked_write_single_batch():
    calls = []

    async def writer(batch):
        calls.append(len(batch))
        return (len(batch), 0)

    docs = [{"i": i} for i in range(3)]
    result = await chunked_write(docs, writer, chunk_size=10)
    assert result["inserted"] == 3
    assert result["failed"] == 0
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_chunked_write_multiple_batches():
    calls = []

    async def writer(batch):
        calls.append(len(batch))
        return (len(batch), 0)

    docs = [{"i": i} for i in range(7)]
    result = await chunked_write(docs, writer, chunk_size=3)
    assert result["inserted"] == 7
    assert calls == [3, 3, 1]


@pytest.mark.asyncio
async def test_chunked_write_handles_errors():
    async def writer(batch):
        raise ConnectionError("timeout")

    docs = [{"i": i} for i in range(5)]
    result = await chunked_write(docs, writer, chunk_size=2)
    assert result["inserted"] == 0
    assert result["failed"] == 5
    assert len(result["errors"]) > 0


@pytest.mark.asyncio
async def test_chunked_write_iter_from_generator():
    calls = []

    async def writer(batch):
        calls.append(len(batch))
        return (len(batch), 0)

    def gen():
        for i in range(10):
            yield {"i": i}

    result = await chunked_write_iter(gen(), writer, chunk_size=4)
    assert result["inserted"] == 10
    assert calls == [4, 4, 2]
```

**Step 4: Commit**

```bash
git add -f services/platform-api/app/infra/serialization.py services/platform-api/tests/infra/test_serialization.py services/platform-api/requirements.txt
git commit -m "feat: add JSONL encode/decode (msgspec) and chunked_write (more-itertools) utilities"
```

---

### Task 4: Jinja2 template rendering

**Files:**
- Modify: `services/platform-api/app/domain/plugins/models.py`
- Modify: `services/platform-api/requirements.txt`
- Modify: `services/platform-api/tests/infra/test_execution_context.py`

**Step 1: Add Jinja2 dependency**

Add to `services/platform-api/requirements.txt` (if not already present from Task 3):

```
Jinja2>=3.1
```

**Step 2: Upgrade render() to use Jinja2**

In `services/platform-api/app/domain/plugins/models.py`, replace the `render` method and `_resolve` helper on `ExecutionContext` with:

```python
    def render(self, template: str) -> str:
        """Render Jinja2/Kestra-style {{ expression }} templates.

        Supports:
        - Variable substitution: {{ outputs.task1.value }}
        - Filters: {{ name | upper }}, {{ list | join(",") }}
        - Conditions: {% if x %}yes{% endif %}
        - Unresolved expressions are preserved as-is.
        """
        if not isinstance(template, str):
            return str(template)
        if "{{" not in template and "{%" not in template:
            return template
        try:
            from jinja2 import Environment, Undefined

            class PreserveUndefined(Undefined):
                """Return the original expression text for undefined variables."""
                def __str__(self):
                    return "{{ " + self._undefined_name + " }}"

            env = Environment(undefined=PreserveUndefined)
            tmpl = env.from_string(template)
            return tmpl.render(**self.variables)
        except Exception:
            return template

    def _resolve(self, dotted_path: str) -> Any:
        """Resolve a dotted path like 'outputs.task1.value' against variables.

        Kept for backward compatibility. Jinja2 handles this natively via
        dot notation in templates, but direct Python access to nested
        variables still uses this helper.
        """
        parts = dotted_path.split(".")
        current: Any = self.variables
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current
```

**Step 3: Add rendering tests**

Append to `services/platform-api/tests/infra/test_execution_context.py`:

```python
def test_render_simple_variable():
    ctx = ExecutionContext(variables={"name": "Alice"})
    assert ctx.render("Hello {{ name }}") == "Hello Alice"


def test_render_nested_variable():
    ctx = ExecutionContext(variables={"outputs": {"task1": {"value": 42}}})
    assert ctx.render("Result: {{ outputs.task1.value }}") == "Result: 42"


def test_render_preserves_unresolved():
    ctx = ExecutionContext(variables={})
    result = ctx.render("{{ unknown_var }}")
    assert "unknown_var" in result


def test_render_filter_upper():
    ctx = ExecutionContext(variables={"name": "alice"})
    assert ctx.render("{{ name | upper }}") == "ALICE"


def test_render_filter_join():
    ctx = ExecutionContext(variables={"items": ["a", "b", "c"]})
    assert ctx.render("{{ items | join(',') }}") == "a,b,c"


def test_render_condition_true():
    ctx = ExecutionContext(variables={"active": True})
    assert ctx.render("{% if active %}yes{% else %}no{% endif %}") == "yes"


def test_render_condition_false():
    ctx = ExecutionContext(variables={"active": False})
    assert ctx.render("{% if active %}yes{% else %}no{% endif %}") == "no"


def test_render_no_template():
    ctx = ExecutionContext()
    assert ctx.render("plain text") == "plain text"


def test_render_non_string():
    ctx = ExecutionContext()
    assert ctx.render(42) == "42"


def test_resolve_dotted_path():
    ctx = ExecutionContext(variables={"a": {"b": {"c": "deep"}}})
    assert ctx._resolve("a.b.c") == "deep"
    assert ctx._resolve("a.b.missing") is None
```

**Step 4: Commit**

```bash
git add services/platform-api/app/domain/plugins/models.py services/platform-api/requirements.txt services/platform-api/tests/infra/test_execution_context.py
git commit -m "feat: upgrade ExecutionContext.render() to Jinja2 with filters, conditions, and preserved undefined"
```

---

# Verification

1. All tests pass: `cd services/platform-api && python -m pytest tests/infra/ -v`
2. ExecutionContext exposes: `upload_file`, `download_file`, `download_file_stream`, `list_files`, `delete_files`, `create_temp_file`, `work_dir`, `cleanup`, `render` (Jinja2)
3. Shared utilities: `encode_jsonl`, `decode_jsonl`, `iter_jsonl`, `encode_jsonl_to_file`, `decode_jsonl_from_file`, `chunked_write`, `chunked_write_iter` in `app/infra/serialization.py`
4. New dependencies: `msgspec>=0.18`, `more-itertools>=10.0`, `Jinja2>=3.1`
5. Existing plugins (GCS, ArangoDB) still work — no breaking changes, only additions
6. No frontend changes

---

# What This Unblocks

After this plan ships, plugin translation becomes pure business logic:

```python
from app.infra.serialization import encode_jsonl, decode_jsonl, chunked_write

class MongoDBFindPlugin(BasePlugin):
    task_types = ["blockdata.load.mongodb.find"]

    async def run(self, params, context):
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        client = pymongo.AsyncMongoClient(creds["uri"])
        cursor = client[params["database"]][params["collection"]].find(
            params.get("filter", {})
        )
        documents = await cursor.to_list(length=params.get("limit"))

        # Substrate handles serialization and storage:
        uri = await context.upload_file(
            "pipeline",
            f"artifacts/{context.execution_id}/result.jsonl",
            encode_jsonl(documents),
        )
        return success(data={"uri": uri, "count": len(documents)})


class MongoDBLoadPlugin(BasePlugin):
    task_types = ["blockdata.load.mongodb.load"]

    async def run(self, params, context):
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        client = pymongo.AsyncMongoClient(creds["uri"])
        collection = client[params["database"]][params["collection"]]

        # Substrate handles download and deserialization:
        data = await context.download_file(params["source_uri"])
        documents = decode_jsonl(data)

        # Substrate handles batching:
        async def write_batch(batch):
            result = await collection.insert_many(batch)
            return (len(result.inserted_ids), 0)

        result = await chunked_write(documents, write_batch, chunk_size=500)
        return success(data=result)
```

No inline `httpx.get()`. No `"\n".join(json.dumps(doc) ...)`. No manual batching. Just business logic.
