# Plugin Runtime Substrate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 6 runtime gaps in ExecutionContext so that translated plugins can run end-to-end without reimplementing file I/O, serialization, temp files, and batching in every plugin. This is the foundation that all plugin translation — integration connectors, core primitives, and block-processing functions — composes on top of.

**Architecture:** Extend ExecutionContext with download_file (with safe streaming), temp file management via stdlib TemporaryDirectory, shared JSONL utilities using msgspec, file list/delete, and Jinja2 template rendering. Extract a chunked_write utility using more-itertools. All changes are in `services/platform-api/` — no migrations, no frontend, no edge functions.

**Tech Stack:** Python 3.11+, msgspec (fast JSON), more-itertools (chunking), Jinja2 (templates), existing httpx + Supabase Storage REST helpers.

**Depends on:** Load Activation (completed). The `user_id` fix in `plugin_execution.py` is already applied.

**New dependencies to add to `requirements.txt`:**
```
msgspec>=0.18
more-itertools>=10.0
Jinja2>=3.1
```

**Why this must come before plugin translation:** Without these, every translated plugin reimplements the same plumbing. The current GCS plugin has inline `httpx.get()` for downloads, inline `json.dumps` for serialization, and holds everything in memory. The ArangoDB plugin has its own batch loop. That pattern cannot scale to 55 GCP functions, 12 MongoDB tasks, 21 JDBC variants, or the hundreds of block-processing functions that are coming.

**What this does NOT solve:** Execution infrastructure (flow engine, worker dispatch, triggers, KV store, retry). Those are separate tracks. This substrate is specifically: file I/O, serialization, temp files, chunking, and template rendering — the services that every plugin's `run()` method needs.

---

## Pre-check: user_id fix (ALREADY DONE)

`plugin_execution.py` line 47 now passes `user_id=auth.user_id` to ExecutionContext. This was the Tier 0 blocker — any connection-backed plugin called via the generic `POST /{function_name}` route would fail without it. Verified in current source.

---

## Scope: 6 tasks

| Task | What it adds | Files touched |
|------|-------------|---------------|
| 1 | `download_file()`, `list_files()`, `delete_files()` on ExecutionContext | `models.py`, `storage.py`, new test file |
| 2 | `create_temp_file()`, `work_dir`, `cleanup()` via `tempfile.TemporaryDirectory` | `models.py`, test file |
| 3 | `encode_jsonl()`, `decode_jsonl()`, `iter_jsonl()`, file-based variants, `chunked_write()` | new `serialization.py`, `requirements.txt`, new test file |
| 4 | Jinja2 `render()` replacing regex | `models.py`, `requirements.txt`, test file |
| 5 | Auth provider abstraction — 6 auth patterns shared across all providers | new `auth_providers.py`, test file |
| 6 | Refactor GCS + ArangoDB plugins onto substrate | `gcs.py`, `arangodb.py`, `gcs_auth.py` (remove), existing tests |

---

### Task 1: File I/O on ExecutionContext

**Files:**
- Modify: `services/platform-api/app/infra/storage.py`
- Modify: `services/platform-api/app/domain/plugins/models.py`
- Create: `services/platform-api/tests/infra/test_execution_context.py`

**Step 1: Add list and delete helpers to storage.py**

In `services/platform-api/app/infra/storage.py`, after the `upsert_to_storage` function, add:

```python
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

In `services/platform-api/app/domain/plugins/models.py`, add these methods to `ExecutionContext` after `upload_file`:

```python
    async def download_file(self, uri: str) -> bytes:
        """Download an artifact from a URL or bucket/path reference.

        Accepts:
        - Full URLs (http:// or https://) — fetched directly
        - Bucket/path strings (e.g. "pipeline/artifacts/file.jsonl") — fetched from Supabase Storage
        """
        if uri.startswith(("http://", "https://")):
            import httpx as _httpx
            async with _httpx.AsyncClient() as client:
                resp = await client.get(uri, timeout=120)
                resp.raise_for_status()
                return resp.content
        from app.infra.storage import download_from_storage
        bucket, _, path = uri.partition("/")
        return await download_from_storage(
            self.supabase_url, self.supabase_key, bucket, path
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
from unittest.mock import AsyncMock, MagicMock, patch
from app.domain.plugins.models import ExecutionContext


@pytest.fixture
def ctx():
    return ExecutionContext(
        execution_id="test-exec-1",
        user_id="user-1",
        supabase_url="https://example.supabase.co",
        supabase_key="test-key",
    )


# --- File I/O ---

@pytest.mark.asyncio
async def test_upload_file(ctx):
    with patch("app.infra.storage.upload_to_storage", new_callable=AsyncMock) as mock:
        mock.return_value = "https://example.supabase.co/storage/v1/object/public/bucket/file.jsonl"
        result = await ctx.upload_file("bucket", "file.jsonl", b"data")
    assert result.startswith("https://")
    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key", "bucket", "file.jsonl", b"data"
    )


@pytest.mark.asyncio
async def test_download_file_http_url(ctx):
    """download_file with a full URL fetches directly via httpx."""
    mock_resp = MagicMock()
    mock_resp.content = b'{"row": 1}\n{"row": 2}'
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await ctx.download_file("https://example.com/data.jsonl")

    assert result == b'{"row": 1}\n{"row": 2}'
    mock_client.get.assert_called_once_with("https://example.com/data.jsonl", timeout=120)


@pytest.mark.asyncio
async def test_download_file_bucket_path(ctx):
    """download_file with a bucket/path string fetches from Supabase Storage."""
    with patch("app.infra.storage.download_from_storage", new_callable=AsyncMock) as mock:
        mock.return_value = b'{"data": true}'
        result = await ctx.download_file("pipeline/load-artifacts/run-1/file.jsonl")

    assert result == b'{"data": true}'
    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key",
        "pipeline", "load-artifacts/run-1/file.jsonl"
    )


@pytest.mark.asyncio
async def test_list_files(ctx):
    with patch("app.infra.storage.list_storage", new_callable=AsyncMock) as mock:
        mock.return_value = [{"name": "a.jsonl"}, {"name": "b.jsonl"}]
        result = await ctx.list_files("pipeline", "load-artifacts/run-1/")

    assert len(result) == 2
    assert result[0]["name"] == "a.jsonl"


@pytest.mark.asyncio
async def test_delete_files(ctx):
    with patch("app.infra.storage.delete_from_storage", new_callable=AsyncMock) as mock:
        await ctx.delete_files("pipeline", ["load-artifacts/run-1/a.jsonl"])

    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key",
        "pipeline", ["load-artifacts/run-1/a.jsonl"]
    )
```

**Step 4: Commit**

```bash
git add -f services/platform-api/app/infra/storage.py services/platform-api/app/domain/plugins/models.py services/platform-api/tests/infra/test_execution_context.py
git commit -m "feat: add download_file, list_files, delete_files to ExecutionContext"
```

---

### Task 2: Temp file management

**Files:**
- Modify: `services/platform-api/app/domain/plugins/models.py`
- Modify: `services/platform-api/tests/infra/test_execution_context.py`

**Step 1: Add imports and temp file support to ExecutionContext**

In `services/platform-api/app/domain/plugins/models.py`, add to the imports at the top:

```python
import tempfile
from pathlib import Path
```

Add a field and methods to `ExecutionContext` (after `delete_files`):

```python
    _work_dir: tempfile.TemporaryDirectory | None = field(default=None, repr=False)

    @property
    def work_dir(self) -> Path:
        """Lazily create and return the execution's working directory.

        Uses stdlib TemporaryDirectory — automatically handles cleanup.
        """
        if self._work_dir is None:
            prefix = f"bd-{self.execution_id[:8]}-" if self.execution_id else "bd-"
            self._work_dir = tempfile.TemporaryDirectory(prefix=prefix)
        return Path(self._work_dir.name)

    def create_temp_file(self, suffix: str = ".tmp") -> Path:
        """Create a temp file in the execution's working directory.

        Returns the Path to an empty file. Caller writes to it.
        Cleaned up automatically when cleanup() is called.
        """
        fd, path_str = tempfile.mkstemp(suffix=suffix, dir=self.work_dir)
        os.close(fd)
        return Path(path_str)

    def cleanup(self) -> None:
        """Delete all temp files created during this execution.

        Safe to call multiple times.
        """
        if self._work_dir is not None:
            self._work_dir.cleanup()
            self._work_dir = None
```

**Step 2: Add tests**

Append to `services/platform-api/tests/infra/test_execution_context.py`:

```python
# --- Temp files ---

def test_work_dir_is_lazy(ctx):
    """Working directory is not created until accessed."""
    assert ctx._work_dir is None
    path = ctx.work_dir
    assert path.exists()
    assert ctx._work_dir is not None
    ctx.cleanup()


def test_create_temp_file(ctx):
    """create_temp_file returns a path in the working directory."""
    path = ctx.create_temp_file(suffix=".jsonl")
    assert path.exists()
    assert path.suffix == ".jsonl"
    assert path.parent == ctx.work_dir
    # Can write and read back
    path.write_text('{"test": true}')
    assert path.read_text() == '{"test": true}'
    ctx.cleanup()
    assert not path.exists()


def test_multiple_temp_files_same_dir(ctx):
    """Multiple temp files share the same working directory."""
    p1 = ctx.create_temp_file(suffix=".csv")
    p2 = ctx.create_temp_file(suffix=".jsonl")
    p3 = ctx.create_temp_file(suffix=".parquet")
    assert p1.parent == p2.parent == p3.parent
    assert len({p1, p2, p3}) == 3  # all different files
    ctx.cleanup()


def test_cleanup_is_idempotent(ctx):
    """cleanup() can be called multiple times without error."""
    ctx.create_temp_file()
    ctx.cleanup()
    ctx.cleanup()  # should not raise
    ctx.cleanup()  # still should not raise


def test_cleanup_without_work_dir(ctx):
    """cleanup() on a context that never created temp files is safe."""
    ctx.cleanup()  # no work_dir ever created, should not raise
```

**Step 3: Commit**

```bash
git add services/platform-api/app/domain/plugins/models.py services/platform-api/tests/infra/test_execution_context.py
git commit -m "feat: add temp file management to ExecutionContext via TemporaryDirectory"
```

---

### Task 3: JSONL serialization + chunked write helper

**Files:**
- Modify: `services/platform-api/requirements.txt`
- Create: `services/platform-api/app/infra/serialization.py`
- Create: `services/platform-api/tests/infra/test_serialization.py`

**Step 1: Add dependencies to requirements.txt**

Add these lines to `services/platform-api/requirements.txt`:

```
msgspec>=0.18
more-itertools>=10.0
```

**Step 2: Create the serialization module**

Create `services/platform-api/app/infra/serialization.py`:

```python
"""Shared JSONL serialization and bulk write utilities.

Uses msgspec for fast JSON encoding/decoding (~5-10x faster than stdlib json).
Uses more-itertools for clean chunking.

JSONL (JSON Lines) is BD's artifact interchange format — line-delimited JSON.
This is BD's equivalent of Kestra's Ion format.

All functions work with bytes for I/O efficiency. Use encode/decode for
in-memory operations, file variants for large data that should not be
held entirely in memory.
"""
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any, Awaitable, Callable

import msgspec.json
from more_itertools import chunked as _chunked

# Module-level encoder/decoder for reuse (thread-safe, stateless)
_encoder = msgspec.json.Encoder()
_decoder = msgspec.json.Decoder()


# ---------------------------------------------------------------------------
# In-memory JSONL encode/decode
# ---------------------------------------------------------------------------

def encode_jsonl(documents: Iterable[dict[str, Any]]) -> bytes:
    """Encode documents as JSONL bytes."""
    return b"\n".join(_encoder.encode(doc) for doc in documents)


def decode_jsonl(data: bytes | str) -> list[dict[str, Any]]:
    """Decode JSONL bytes or string into a list of dicts."""
    raw = data.encode("utf-8") if isinstance(data, str) else data
    return [_decoder.decode(line) for line in raw.strip().split(b"\n") if line.strip()]


def iter_jsonl(data: bytes | str) -> Iterator[dict[str, Any]]:
    """Iterate JSONL lines one at a time without loading all into memory."""
    raw = data.encode("utf-8") if isinstance(data, str) else data
    for line in raw.split(b"\n"):
        line = line.strip()
        if line:
            yield _decoder.decode(line)


# ---------------------------------------------------------------------------
# File-based JSONL for large datasets
# ---------------------------------------------------------------------------

def encode_jsonl_to_file(documents: Iterable[dict[str, Any]], path: Path) -> int:
    """Write documents as JSONL to a file on disk. Returns row count.

    Use this when the dataset is too large to hold in memory as bytes.
    Pairs with create_temp_file() on ExecutionContext.
    """
    count = 0
    with open(path, "wb") as f:
        for doc in documents:
            f.write(_encoder.encode(doc))
            f.write(b"\n")
            count += 1
    return count


def decode_jsonl_from_file(path: Path) -> Iterator[dict[str, Any]]:
    """Stream JSONL lines from a file one at a time.

    Use this when the file is too large to load entirely into memory.
    """
    with open(path, "rb") as f:
        for line in f:
            line = line.strip()
            if line:
                yield _decoder.decode(line)


# ---------------------------------------------------------------------------
# Chunked bulk write
# ---------------------------------------------------------------------------

async def chunked_write(
    documents: Iterable[dict[str, Any]],
    writer_fn: Callable[[list[dict[str, Any]]], Awaitable[tuple[int, int]]],
    chunk_size: int = 500,
) -> dict[str, Any]:
    """Batch documents into chunks and call writer_fn per chunk.

    Uses more-itertools.chunked() for clean batching. Accepts any iterable
    including generators and file-based iterators — does not require a list.

    writer_fn signature: async (batch: list[dict]) -> (inserted: int, failed: int)

    Returns:
        {"inserted": int, "failed": int, "total": int, "errors": list[str]}
    """
    total_inserted = 0
    total_failed = 0
    errors: list[str] = []

    for batch in _chunked(documents, chunk_size):
        try:
            inserted, failed = await writer_fn(list(batch))
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
```

**Step 3: Write tests**

Create `services/platform-api/tests/infra/test_serialization.py`:

```python
import pytest
from pathlib import Path
from app.infra.serialization import (
    encode_jsonl, decode_jsonl, iter_jsonl,
    encode_jsonl_to_file, decode_jsonl_from_file,
    chunked_write,
)


# --- In-memory encode/decode ---

def test_encode_jsonl_produces_bytes():
    docs = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
    result = encode_jsonl(docs)
    assert isinstance(result, bytes)
    lines = result.split(b"\n")
    assert len(lines) == 2
    assert b"Alice" in lines[0]
    assert b"Bob" in lines[1]


def test_decode_jsonl_from_bytes():
    data = b'{"name":"Alice"}\n{"name":"Bob"}'
    result = decode_jsonl(data)
    assert len(result) == 2
    assert result[0]["name"] == "Alice"
    assert result[1]["name"] == "Bob"


def test_decode_jsonl_from_string():
    data = '{"a":1}\n{"b":2}'
    result = decode_jsonl(data)
    assert len(result) == 2


def test_decode_jsonl_trailing_newline():
    data = b'{"a":1}\n{"b":2}\n'
    result = decode_jsonl(data)
    assert len(result) == 2


def test_decode_jsonl_empty_lines():
    data = b'{"a":1}\n\n{"b":2}\n\n'
    result = decode_jsonl(data)
    assert len(result) == 2


def test_encode_decode_round_trip():
    docs = [{"id": i, "value": f"row-{i}"} for i in range(10)]
    encoded = encode_jsonl(docs)
    decoded = decode_jsonl(encoded)
    assert decoded == docs


def test_iter_jsonl():
    data = b'{"a":1}\n{"b":2}\n{"c":3}'
    items = list(iter_jsonl(data))
    assert len(items) == 3
    assert items[0] == {"a": 1}
    assert items[2] == {"c": 3}


def test_encode_jsonl_from_generator():
    """encode_jsonl accepts any iterable, not just lists."""
    def gen():
        for i in range(3):
            yield {"i": i}
    result = encode_jsonl(gen())
    decoded = decode_jsonl(result)
    assert len(decoded) == 3


# --- File-based encode/decode ---

def test_encode_jsonl_to_file(tmp_path):
    docs = [{"x": i} for i in range(100)]
    path = tmp_path / "test.jsonl"
    count = encode_jsonl_to_file(docs, path)
    assert count == 100
    assert path.exists()
    assert path.stat().st_size > 0


def test_decode_jsonl_from_file(tmp_path):
    path = tmp_path / "test.jsonl"
    path.write_bytes(b'{"a":1}\n{"b":2}\n{"c":3}\n')
    items = list(decode_jsonl_from_file(path))
    assert len(items) == 3
    assert items[1] == {"b": 2}


def test_file_round_trip(tmp_path):
    docs = [{"id": i, "val": f"row-{i}"} for i in range(500)]
    path = tmp_path / "round.jsonl"
    encode_jsonl_to_file(docs, path)
    decoded = list(decode_jsonl_from_file(path))
    assert decoded == docs


def test_decode_file_is_streaming(tmp_path):
    """decode_jsonl_from_file returns an iterator, not a list."""
    path = tmp_path / "test.jsonl"
    path.write_bytes(b'{"a":1}\n{"b":2}\n')
    result = decode_jsonl_from_file(path)
    assert hasattr(result, '__next__')  # it's an iterator
    assert next(result) == {"a": 1}
    assert next(result) == {"b": 2}


# --- Chunked write ---

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
    assert result["total"] == 3
    assert calls == [3]


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
async def test_chunked_write_partial_failure():
    """writer_fn can report partial failures per batch."""
    async def writer(batch):
        return (len(batch) - 1, 1)  # one failure per batch

    docs = [{"i": i} for i in range(6)]
    result = await chunked_write(docs, writer, chunk_size=3)
    assert result["inserted"] == 4  # 2 + 2
    assert result["failed"] == 2    # 1 + 1


@pytest.mark.asyncio
async def test_chunked_write_exception_in_batch():
    """If writer_fn throws, the entire batch is counted as failed."""
    async def writer(batch):
        raise ConnectionError("timeout")

    docs = [{"i": i} for i in range(5)]
    result = await chunked_write(docs, writer, chunk_size=2)
    assert result["inserted"] == 0
    assert result["failed"] == 5
    assert len(result["errors"]) == 3  # 3 batches of [2, 2, 1]


@pytest.mark.asyncio
async def test_chunked_write_from_generator():
    """chunked_write accepts generators, not just lists."""
    calls = []
    async def writer(batch):
        calls.append(len(batch))
        return (len(batch), 0)

    def gen():
        for i in range(10):
            yield {"i": i}

    result = await chunked_write(gen(), writer, chunk_size=4)
    assert result["inserted"] == 10
    assert calls == [4, 4, 2]


@pytest.mark.asyncio
async def test_chunked_write_empty():
    """chunked_write with empty input does nothing."""
    async def writer(batch):
        raise AssertionError("should not be called")

    result = await chunked_write([], writer, chunk_size=10)
    assert result["inserted"] == 0
    assert result["failed"] == 0
```

**Step 4: Commit**

```bash
git add -f services/platform-api/app/infra/serialization.py services/platform-api/tests/infra/test_serialization.py services/platform-api/requirements.txt
git commit -m "feat: add JSONL encode/decode (msgspec) and chunked_write (more-itertools)"
```

---

### Task 4: Jinja2 template rendering

**Files:**
- Modify: `services/platform-api/requirements.txt`
- Modify: `services/platform-api/app/domain/plugins/models.py`
- Modify: `services/platform-api/tests/infra/test_execution_context.py`

**Step 1: Add Jinja2 dependency**

Add to `services/platform-api/requirements.txt`:

```
Jinja2>=3.1
```

**Step 2: Replace render() with Jinja2 implementation**

In `services/platform-api/app/domain/plugins/models.py`, replace the `render` method (lines 73-87) with:

```python
    def render(self, template: str) -> str:
        """Render Jinja2/Kestra-style {{ expression }} templates.

        Supports:
        - Variable substitution: {{ outputs.task1.value }}
        - Filters: {{ name | upper }}, {{ items | join(",") }}
        - Conditions: {% if active %}yes{% else %}no{% endif %}
        - Nested dict access via dot notation (Jinja2 native)
        - Unresolved variables are preserved as-is: {{ unknown }} stays as {{ unknown }}
        """
        if not isinstance(template, str):
            return str(template)
        if "{{" not in template and "{%" not in template:
            return template
        try:
            from jinja2 import Environment, Undefined

            class _PreserveUndefined(Undefined):
                """Render undefined variables back as {{ name }} instead of empty string."""
                def __str__(self):
                    return "{{ " + self._undefined_name + " }}"
                def __iter__(self):
                    return iter([])
                def __bool__(self):
                    return False

            env = Environment(undefined=_PreserveUndefined)
            tmpl = env.from_string(template)
            return tmpl.render(**self.variables)
        except Exception:
            # If Jinja2 fails for any reason, return the template as-is
            return template
```

Remove the old `re` import from the top of the file if it's no longer used elsewhere. Keep the `_resolve` method — it's still useful for direct programmatic access to nested variables outside of templates.

**Step 3: Add template rendering tests**

Append to `services/platform-api/tests/infra/test_execution_context.py`:

```python
# --- Template rendering (Jinja2) ---

def test_render_simple_variable():
    ctx = ExecutionContext(variables={"name": "Alice"})
    assert ctx.render("Hello {{ name }}") == "Hello Alice"


def test_render_nested_dict():
    ctx = ExecutionContext(variables={"outputs": {"task1": {"value": 42}}})
    assert ctx.render("Result: {{ outputs.task1.value }}") == "Result: 42"


def test_render_preserves_undefined():
    """Undefined variables are preserved as {{ name }}, not rendered as empty."""
    ctx = ExecutionContext(variables={})
    result = ctx.render("{{ unknown_var }}")
    assert "unknown_var" in result


def test_render_filter_upper():
    ctx = ExecutionContext(variables={"name": "alice"})
    assert ctx.render("{{ name | upper }}") == "ALICE"


def test_render_filter_join():
    ctx = ExecutionContext(variables={"items": ["a", "b", "c"]})
    assert ctx.render("{{ items | join(',') }}") == "a,b,c"


def test_render_filter_default():
    ctx = ExecutionContext(variables={})
    assert ctx.render("{{ missing | default('fallback') }}") == "fallback"


def test_render_filter_length():
    ctx = ExecutionContext(variables={"items": [1, 2, 3]})
    assert ctx.render("{{ items | length }}") == "3"


def test_render_condition_true():
    ctx = ExecutionContext(variables={"active": True})
    assert ctx.render("{% if active %}yes{% else %}no{% endif %}") == "yes"


def test_render_condition_false():
    ctx = ExecutionContext(variables={"active": False})
    assert ctx.render("{% if active %}yes{% else %}no{% endif %}") == "no"


def test_render_loop():
    ctx = ExecutionContext(variables={"items": ["a", "b", "c"]})
    result = ctx.render("{% for x in items %}{{ x }}{% endfor %}")
    assert result == "abc"


def test_render_plain_text():
    """Strings without {{ or {% are returned as-is (fast path)."""
    ctx = ExecutionContext()
    assert ctx.render("just plain text") == "just plain text"


def test_render_non_string():
    """Non-string input is converted to string."""
    ctx = ExecutionContext()
    assert ctx.render(42) == "42"
    assert ctx.render(True) == "True"


def test_render_mixed_resolved_and_unresolved():
    ctx = ExecutionContext(variables={"name": "Alice"})
    result = ctx.render("Hello {{ name }}, your id is {{ user_id }}")
    assert "Alice" in result
    assert "user_id" in result


def test_resolve_still_works():
    """_resolve helper for programmatic access still works."""
    ctx = ExecutionContext(variables={"a": {"b": {"c": "deep"}}})
    assert ctx._resolve("a.b.c") == "deep"
    assert ctx._resolve("a.b.missing") is None
    assert ctx._resolve("nonexistent") is None
```

**Step 4: Commit**

```bash
git add services/platform-api/app/domain/plugins/models.py services/platform-api/requirements.txt services/platform-api/tests/infra/test_execution_context.py
git commit -m "feat: upgrade ExecutionContext.render() to Jinja2 with filters, conditions, loops"
```

---

### Task 5: Auth provider abstraction

**Files:**
- Create: `services/platform-api/app/infra/auth_providers.py`
- Create: `services/platform-api/tests/infra/test_auth_providers.py`

**Why:** Every integration plugin authenticates with an external service. Today, GCS has inline OAuth token exchange in `gcs_auth.py`, ArangoDB has inline BasicAuth in its `run()` method. When we add AWS (IAM/STS), MongoDB (connection string), OpenAI (API key), Azure (client credentials), each will reimplement its own auth. Six auth patterns cover nearly every integration. Build them once.

**Step 1: Create the auth provider module**

Create `services/platform-api/app/infra/auth_providers.py`:

```python
"""Authentication providers for external service integrations.

Six patterns that cover nearly every integration. Plugins declare which
pattern they use. The substrate handles credential exchange.

Usage in a plugin:
    from app.infra.auth_providers import resolve_auth
    auth = await resolve_auth(creds)
    # auth.headers → {"Authorization": "Bearer ..."} for HTTP APIs
    # auth.token → raw token string
    # auth.credentials → provider-specific auth object
"""
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import httpx


@dataclass
class AuthResult:
    """Standardized auth result that plugins consume."""
    headers: dict[str, str] = field(default_factory=dict)
    token: str = ""
    credentials: dict[str, Any] = field(default_factory=dict)


class AuthProvider(ABC):
    """Base class for all auth patterns."""

    @abstractmethod
    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        """Transform raw credentials into ready-to-use auth."""
        ...


class APIKeyAuth(AuthProvider):
    """API key in a header. Used by: Anthropic, OpenAI, Cohere, Jina, Voyage.

    Expects creds: {"api_key": "sk-..."}
    Optional: {"header_name": "x-api-key"} (default: "Authorization: Bearer")
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        api_key = creds["api_key"]
        header_name = creds.get("header_name", "")
        if header_name:
            return AuthResult(
                headers={header_name: api_key},
                token=api_key,
                credentials=creds,
            )
        return AuthResult(
            headers={"Authorization": f"Bearer {api_key}"},
            token=api_key,
            credentials=creds,
        )


class BasicAuth(AuthProvider):
    """HTTP Basic authentication. Used by: ArangoDB, Elasticsearch, some JDBC.

    Expects creds: {"username": "...", "password": "..."}
    Also passes through additional fields (endpoint, database, etc.).
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        import base64
        username = creds["username"]
        password = creds["password"]
        encoded = base64.b64encode(f"{username}:{password}".encode()).decode()
        return AuthResult(
            headers={"Authorization": f"Basic {encoded}"},
            token=encoded,
            credentials=creds,
        )


class ConnectionStringAuth(AuthProvider):
    """Connection string with embedded credentials. Used by: MongoDB, Redis, Postgres, MySQL.

    Expects creds: {"uri": "mongodb+srv://user:pass@host/db"} or similar.
    No HTTP headers — the client library handles auth from the URI.
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        return AuthResult(
            headers={},
            token="",
            credentials=creds,
        )


class OAuth2ServiceAccount(AuthProvider):
    """GCP-style OAuth2 service account. Used by: GCP (all services).

    Expects creds: {"client_email": "...", "private_key": "...", "project_id": "..."}
    Optional: {"scopes": ["https://..."], "token_uri": "https://oauth2.googleapis.com/token"}
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        import jwt as _jwt  # PyJWT

        now = int(time.time())
        scopes = creds.get("scopes", ["https://www.googleapis.com/auth/cloud-platform"])
        token_uri = creds.get("token_uri", "https://oauth2.googleapis.com/token")

        payload = {
            "iss": creds["client_email"],
            "scope": " ".join(scopes) if isinstance(scopes, list) else scopes,
            "aud": token_uri,
            "iat": now,
            "exp": now + 3600,
        }
        signed_jwt = _jwt.encode(payload, creds["private_key"], algorithm="RS256")

        async with httpx.AsyncClient() as client:
            resp = await client.post(token_uri, data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": signed_jwt,
            }, timeout=10)
            resp.raise_for_status()

        access_token = resp.json()["access_token"]
        return AuthResult(
            headers={"Authorization": f"Bearer {access_token}"},
            token=access_token,
            credentials={**creds, "access_token": access_token},
        )


class OAuth2ClientCredentials(AuthProvider):
    """OAuth2 client credentials flow. Used by: Azure, Salesforce, HubSpot.

    Expects creds: {"client_id": "...", "client_secret": "...", "token_url": "..."}
    Optional: {"scope": "https://...""}
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        token_url = creds["token_url"]
        data = {
            "grant_type": "client_credentials",
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
        }
        if creds.get("scope"):
            data["scope"] = creds["scope"]

        async with httpx.AsyncClient() as client:
            resp = await client.post(token_url, data=data, timeout=10)
            resp.raise_for_status()

        access_token = resp.json()["access_token"]
        return AuthResult(
            headers={"Authorization": f"Bearer {access_token}"},
            token=access_token,
            credentials={**creds, "access_token": access_token},
        )


class IAMAuth(AuthProvider):
    """AWS IAM authentication. Used by: AWS (all services).

    Expects creds: {"access_key_id": "...", "secret_access_key": "...", "region": "..."}
    Optional: {"session_token": "..."} for assumed roles.

    NOTE: AWS Signature V4 signing is complex. This provider returns the
    raw credentials for use with boto3/aiobotocore which handle signing
    internally. For direct HTTP calls, use botocore's request signer.
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        # AWS signing is handled by the SDK (boto3/aiobotocore), not by HTTP headers.
        # We pass credentials through for the SDK to consume.
        return AuthResult(
            headers={},
            token="",
            credentials={
                "aws_access_key_id": creds["access_key_id"],
                "aws_secret_access_key": creds["secret_access_key"],
                "region_name": creds.get("region", "us-east-1"),
                **({"aws_session_token": creds["session_token"]}
                   if creds.get("session_token") else {}),
            },
        )


# ---------------------------------------------------------------------------
# Registry: map auth pattern names to providers
# ---------------------------------------------------------------------------

AUTH_PROVIDERS: dict[str, AuthProvider] = {
    "api_key": APIKeyAuth(),
    "basic": BasicAuth(),
    "connection_string": ConnectionStringAuth(),
    "oauth2_service_account": OAuth2ServiceAccount(),
    "oauth2_client_credentials": OAuth2ClientCredentials(),
    "iam": IAMAuth(),
}


async def resolve_auth(creds: dict[str, Any], auth_type: str | None = None) -> AuthResult:
    """Resolve authentication from credentials.

    If auth_type is provided, uses that specific provider.
    Otherwise, infers from credential fields:
    - Has "api_key" → APIKeyAuth
    - Has "username" + "password" → BasicAuth
    - Has "uri" → ConnectionStringAuth
    - Has "client_email" + "private_key" → OAuth2ServiceAccount
    - Has "client_id" + "client_secret" → OAuth2ClientCredentials
    - Has "access_key_id" → IAMAuth
    """
    if auth_type and auth_type in AUTH_PROVIDERS:
        return await AUTH_PROVIDERS[auth_type].authenticate(creds)

    # Auto-detect from credential fields
    if "api_key" in creds:
        return await AUTH_PROVIDERS["api_key"].authenticate(creds)
    if "username" in creds and "password" in creds:
        return await AUTH_PROVIDERS["basic"].authenticate(creds)
    if "uri" in creds:
        return await AUTH_PROVIDERS["connection_string"].authenticate(creds)
    if "client_email" in creds and "private_key" in creds:
        return await AUTH_PROVIDERS["oauth2_service_account"].authenticate(creds)
    if "client_id" in creds and "client_secret" in creds:
        return await AUTH_PROVIDERS["oauth2_client_credentials"].authenticate(creds)
    if "access_key_id" in creds:
        return await AUTH_PROVIDERS["iam"].authenticate(creds)

    # Fallback: return credentials as-is
    return AuthResult(credentials=creds)
```

**Step 2: Write tests**

Create `services/platform-api/tests/infra/test_auth_providers.py`:

```python
import pytest
from app.infra.auth_providers import (
    APIKeyAuth, BasicAuth, ConnectionStringAuth, IAMAuth,
    resolve_auth, AuthResult,
)


@pytest.mark.asyncio
async def test_api_key_bearer():
    auth = APIKeyAuth()
    result = await auth.authenticate({"api_key": "sk-test-123"})
    assert result.headers["Authorization"] == "Bearer sk-test-123"
    assert result.token == "sk-test-123"


@pytest.mark.asyncio
async def test_api_key_custom_header():
    auth = APIKeyAuth()
    result = await auth.authenticate({"api_key": "sk-test", "header_name": "x-api-key"})
    assert result.headers["x-api-key"] == "sk-test"
    assert "Authorization" not in result.headers


@pytest.mark.asyncio
async def test_basic_auth():
    auth = BasicAuth()
    result = await auth.authenticate({"username": "root", "password": "secret"})
    assert result.headers["Authorization"].startswith("Basic ")
    import base64
    decoded = base64.b64decode(result.token).decode()
    assert decoded == "root:secret"


@pytest.mark.asyncio
async def test_connection_string():
    auth = ConnectionStringAuth()
    result = await auth.authenticate({"uri": "mongodb+srv://user:pass@host/db"})
    assert result.headers == {}
    assert result.credentials["uri"] == "mongodb+srv://user:pass@host/db"


@pytest.mark.asyncio
async def test_iam_auth():
    auth = IAMAuth()
    result = await auth.authenticate({
        "access_key_id": "AKIA...",
        "secret_access_key": "secret",
        "region": "us-west-2",
    })
    assert result.credentials["aws_access_key_id"] == "AKIA..."
    assert result.credentials["region_name"] == "us-west-2"


@pytest.mark.asyncio
async def test_iam_auth_with_session_token():
    auth = IAMAuth()
    result = await auth.authenticate({
        "access_key_id": "AKIA...",
        "secret_access_key": "secret",
        "session_token": "FwoGZX...",
    })
    assert result.credentials["aws_session_token"] == "FwoGZX..."


# --- Auto-detection via resolve_auth ---

@pytest.mark.asyncio
async def test_resolve_auth_api_key():
    result = await resolve_auth({"api_key": "sk-test"})
    assert result.headers["Authorization"] == "Bearer sk-test"


@pytest.mark.asyncio
async def test_resolve_auth_basic():
    result = await resolve_auth({"username": "user", "password": "pass"})
    assert result.headers["Authorization"].startswith("Basic ")


@pytest.mark.asyncio
async def test_resolve_auth_connection_string():
    result = await resolve_auth({"uri": "redis://localhost:6379"})
    assert result.credentials["uri"] == "redis://localhost:6379"


@pytest.mark.asyncio
async def test_resolve_auth_iam():
    result = await resolve_auth({"access_key_id": "AKIA", "secret_access_key": "s"})
    assert result.credentials["aws_access_key_id"] == "AKIA"


@pytest.mark.asyncio
async def test_resolve_auth_explicit_type():
    result = await resolve_auth({"api_key": "sk-test"}, auth_type="api_key")
    assert result.token == "sk-test"


@pytest.mark.asyncio
async def test_resolve_auth_unknown_fallback():
    result = await resolve_auth({"some_field": "value"})
    assert result.credentials == {"some_field": "value"}
    assert result.headers == {}
```

Note: `OAuth2ServiceAccount` and `OAuth2ClientCredentials` tests require mocking external HTTP calls (token endpoints). Those tests should mock `httpx.AsyncClient`:

```python
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_oauth2_service_account():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "ya29.test-token"}
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        from app.infra.auth_providers import OAuth2ServiceAccount
        auth = OAuth2ServiceAccount()
        result = await auth.authenticate({
            "client_email": "sa@project.iam.gserviceaccount.com",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
            "project_id": "my-project",
        })

    assert result.headers["Authorization"] == "Bearer ya29.test-token"
    assert result.token == "ya29.test-token"


@pytest.mark.asyncio
async def test_oauth2_client_credentials():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "eyJ0est"}
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        from app.infra.auth_providers import OAuth2ClientCredentials
        auth = OAuth2ClientCredentials()
        result = await auth.authenticate({
            "client_id": "app-id",
            "client_secret": "app-secret",
            "token_url": "https://login.microsoftonline.com/tenant/oauth2/v2.0/token",
            "scope": "https://graph.microsoft.com/.default",
        })

    assert result.headers["Authorization"] == "Bearer eyJ0est"
```

**Step 3: Commit**

```bash
git add -f services/platform-api/app/infra/auth_providers.py services/platform-api/tests/infra/test_auth_providers.py
git commit -m "feat: add auth provider abstraction — 6 patterns covering all integration auth"
```

---

### Task 6: Refactor GCS + ArangoDB plugins onto substrate

**Files:**
- Modify: `services/platform-api/app/plugins/gcs.py`
- Modify: `services/platform-api/app/plugins/arangodb.py`
- Remove: `services/platform-api/app/infra/gcs_auth.py` (replaced by `OAuth2ServiceAccount` auth provider)
- Modify: `services/platform-api/tests/plugins/test_gcs.py`
- Modify: `services/platform-api/tests/plugins/test_arangodb.py`

**Why:** The two existing plugins are the only code that uses the old inline patterns. If they stay as-is, they become legacy exceptions that new developers copy as templates. Refactoring them onto the substrate validates the substrate against real working code and makes them the reference implementation for all future plugins.

**Step 1: Refactor GCS plugins**

Replace inline auth with `resolve_auth`:

```python
# Before (gcs.py):
from ..infra.gcs_auth import get_gcs_access_token
token = get_gcs_access_token(creds)
headers = {"Authorization": f"Bearer {token}"}

# After:
from app.infra.auth_providers import resolve_auth
auth = await resolve_auth(creds)  # auto-detects OAuth2ServiceAccount from client_email + private_key
# auth.headers already contains {"Authorization": "Bearer ya29.xxx"}
```

Replace inline JSONL serialization with shared utility:

```python
# Before (gcs.py GCSDownloadCsvPlugin):
jsonl_lines = [json_mod.dumps(doc) for doc in documents]
jsonl_bytes = ("\n".join(jsonl_lines)).encode("utf-8")
storage_uri = await context.upload_file("pipeline", storage_path, jsonl_bytes)

# After:
from app.infra.serialization import encode_jsonl
storage_uri = await context.upload_file("pipeline", storage_path, encode_jsonl(documents))
```

Remove `gcs_auth.py` — its functionality is now in `OAuth2ServiceAccount`.

**Step 2: Refactor ArangoDB plugin**

Replace inline auth:

```python
# Before (arangodb.py):
auth = httpx.BasicAuth(username, password)

# After:
from app.infra.auth_providers import resolve_auth
auth_result = await resolve_auth(creds)  # auto-detects BasicAuth from username + password
```

Replace inline artifact download with `context.download_file`:

```python
# Before:
async with httpx.AsyncClient() as dl_client:
    dl_resp = await dl_client.get(source_uri, timeout=120)
    documents = [json_mod.loads(line) for line in dl_resp.text.strip().split("\n") if line.strip()]

# After:
from app.infra.serialization import decode_jsonl
data = await context.download_file(source_uri)
documents = decode_jsonl(data)
```

Replace inline batch loop with `chunked_write`:

```python
# Before:
for i in range(0, len(documents), BATCH_SIZE):
    batch = documents[i:i + BATCH_SIZE]
    resp = await client.post(...)
    # inline counting...

# After:
from app.infra.serialization import chunked_write

async def write_batch(batch):
    resp = await client.post(f"{base}/_api/document/{collection}", json=batch, auth=http_auth, timeout=60)
    if resp.status_code in (200, 201, 202):
        results = resp.json()
        inserted = sum(1 for r in results if isinstance(r, dict) and not r.get("error"))
        failed = len(results) - inserted
        return (inserted, failed)
    return (0, len(batch))

result = await chunked_write(documents, write_batch, chunk_size=500)
```

**Step 3: Update tests**

Update test mocks to match new import paths. The test assertions stay the same — same inputs, same outputs. Only the internal implementation path changes.

Key mock changes:
- `patch("app.plugins.gcs.get_gcs_access_token")` → `patch("app.infra.auth_providers.OAuth2ServiceAccount.authenticate")`
- `patch("app.plugins.arangodb.httpx")` mocks stay but the download path now goes through `context.download_file`

**Step 4: Verify existing behavior preserved**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_gcs.py tests/plugins/test_arangodb.py -v`
Expected: All existing tests PASS with refactored code.

**Step 5: Commit**

```bash
git add services/platform-api/app/plugins/gcs.py services/platform-api/app/plugins/arangodb.py services/platform-api/tests/plugins/test_gcs.py services/platform-api/tests/plugins/test_arangodb.py
git rm services/platform-api/app/infra/gcs_auth.py
git commit -m "refactor: migrate GCS + ArangoDB plugins to substrate (auth_providers, serialization, context methods)"
```

---

# Verification

After all 6 tasks:

1. **All tests pass:**
   ```
   cd services/platform-api && python -m pytest tests/infra/ tests/plugins/ -v
   ```
2. **ExecutionContext API:**
   - `upload_file(bucket, path, content)` — write to storage (existed)
   - `download_file(uri)` — read from storage or URL (NEW)
   - `list_files(bucket, prefix)` — list storage contents (NEW)
   - `delete_files(bucket, paths)` — delete from storage (NEW)
   - `create_temp_file(suffix)` — local disk buffer (NEW)
   - `work_dir` — lazy working directory (NEW)
   - `cleanup()` — delete all temp files (NEW)
   - `render(template)` — Jinja2 with filters, conditions, loops (UPGRADED)
   - `get_secret(key)` — env var access (existed)
   - `user_id` — authenticated user identity (existed, wired in generic route)
3. **Shared serialization:** `encode_jsonl`, `decode_jsonl`, `iter_jsonl`, file-based variants, `chunked_write` in `app/infra/serialization.py`
4. **Auth providers:** 6 patterns (`api_key`, `basic`, `connection_string`, `oauth2_service_account`, `oauth2_client_credentials`, `iam`) + auto-detection via `resolve_auth()` in `app/infra/auth_providers.py`
5. **Existing plugins refactored:** GCS and ArangoDB use substrate (auth_providers, serialization, context methods). `gcs_auth.py` removed. No inline httpx, no inline json.dumps, no inline batch loops.
6. **New dependencies:** `msgspec>=0.18`, `more-itertools>=10.0`, `Jinja2>=3.1`
7. **No frontend changes. No migration changes.**
8. **Zero legacy patterns remain.** Every plugin in `app/plugins/` uses the substrate. New plugins copy from GCS/ArangoDB as reference.

---

# What This Unlocks

After this substrate ships, every plugin pattern uses the same runtime. No inline plumbing. Just business logic.

**Source → Destination load pipeline** (GCS CSV → ArangoDB):
```python
class GCSDownloadCsv(BasePlugin):
    async def run(self, params, context):
        auth = await resolve_auth(resolve_connection_sync(params["connection_id"], context.user_id))
        resp = await httpx.AsyncClient().get(gcs_url, headers=auth.headers)
        documents = list(csv.DictReader(io.StringIO(resp.text)))
        uri = await context.upload_file("pipeline", path, encode_jsonl(documents))
        return success(data={"uri": uri, "count": len(documents)})
```

**Bulk destination** (ArangoDB, Elasticsearch, any batch API):
```python
class ArangoDBLoad(BasePlugin):
    async def run(self, params, context):
        auth = await resolve_auth(resolve_connection_sync(params["connection_id"], context.user_id))
        data = await context.download_file(params["source_uri"])
        result = await chunked_write(iter_jsonl(data), write_batch_fn, chunk_size=500)
        return success(data=result)
```

**AI completion** (Anthropic, OpenAI, Gemini):
```python
class AnthropicChat(BasePlugin):
    async def run(self, params, context):
        auth = await resolve_auth(resolve_connection_sync(params["connection_id"], context.user_id))
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://api.anthropic.com/v1/messages",
                json={"messages": params["messages"], "model": params.get("model", "claude-sonnet-4-5-20250929")},
                headers=auth.headers)
        return success(data={"text": resp.json()["content"][0]["text"]})
```

**SQL query** (Postgres, MySQL via connection string):
```python
class PostgresQuery(BasePlugin):
    async def run(self, params, context):
        auth = await resolve_auth(resolve_connection_sync(params["connection_id"], context.user_id))
        conn = await asyncpg.connect(auth.credentials["uri"])
        rows = await conn.fetch(context.render(params["sql"]))
        uri = await context.upload_file("pipeline", path, encode_jsonl([dict(r) for r in rows]))
        return success(data={"uri": uri, "row_count": len(rows)})
```

**Notification** (Slack, email, webhook):
```python
class SlackMessage(BasePlugin):
    async def run(self, params, context):
        auth = await resolve_auth(resolve_connection_sync(params["connection_id"], context.user_id))
        message = context.render(params["message"])  # Jinja2 with {{ variables }}
        async with httpx.AsyncClient() as client:
            await client.post(params["webhook_url"], json={"text": message}, headers=auth.headers)
        return success(data={"sent": True})
```

**Block processing** (Python batch operations on workspace blocks):
```python
class ClassifyBlocks(BasePlugin):
    async def run(self, params, context):
        data = await context.download_file(params["source_uri"])
        results = []
        for block in iter_jsonl(data):
            block["category"] = classify(block["content"])  # your Python logic
            results.append(block)
        uri = await context.upload_file("pipeline", path, encode_jsonl(results))
        return success(data={"uri": uri, "processed": len(results)})
```

**Large file processing** (disk-buffered for big datasets):
```python
class LargeCSVProcessor(BasePlugin):
    async def run(self, params, context):
        data = await context.download_file(params["source_uri"])
        temp = context.create_temp_file(suffix=".jsonl")
        count = encode_jsonl_to_file(iter_jsonl(data), temp)
        # stream through temp file without holding all in memory...
        context.cleanup()
        return success(data={"processed": count})
```

**Every pattern:** same auth, same file I/O, same serialization, same rendering. The substrate is the runtime.
