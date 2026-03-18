# kt/blockdata High-Fidelity Kestra Translation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade every kt/blockdata core file from its current fidelity level to HIGH fidelity against the Kestra Java source (kestra-repos/kestra/core/src/main/java/io/kestra/core/).

**Architecture:** Each task targets one file, adds the missing enum values / methods / fields / protocols that Kestra defines, and includes a failing test first. The worker execution path (runner.py, worker_task_callable.py) is already HIGH fidelity and is not touched. The MongoDB connector layer is not touched — this plan is infrastructure-only.

**Tech Stack:** Python 3.11+, dataclasses, typing.Protocol, pytest, ThreadPoolExecutor

**Source reference:** `/home/jon/kestra-repos/kestra/core/src/main/java/io/kestra/core/`

---

## Task 1: state.py — Add Missing Enum Values and Methods

**Current:** 7 of 16 enum values, 2 methods. **Target:** All 16 values, all query methods, `terminated_types()` static set.

**Files:**
- Modify: `kt/blockdata/core/models/flows/state.py`
- Test: `kt/tests/test_state.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_state.py
from __future__ import annotations

import pytest
from blockdata.core.models.flows.state import State


def test_all_sixteen_enum_values_exist() -> None:
    expected = {
        "CREATED", "SUBMITTED", "RUNNING", "PAUSED", "RESTARTED",
        "KILLING", "SUCCESS", "WARNING", "FAILED", "KILLED",
        "CANCELLED", "QUEUED", "RETRYING", "RETRIED", "SKIPPED",
        "BREAKPOINT", "RESUBMITTED",
    }
    actual = {s.value for s in State}
    assert actual == expected


def test_is_terminated_returns_true_for_terminal_states() -> None:
    terminal = {State.SUCCESS, State.FAILED, State.WARNING, State.KILLED,
                State.SKIPPED, State.CANCELLED, State.RETRIED}
    for state in terminal:
        assert state.is_terminated(), f"{state} should be terminated"
    for state in State:
        if state not in terminal:
            assert not state.is_terminated(), f"{state} should NOT be terminated"


def test_is_running_returns_true_for_running_states() -> None:
    running = {State.RUNNING, State.KILLING}
    for state in running:
        assert state.is_running(), f"{state} should be running"


def test_is_failed() -> None:
    assert State.FAILED.is_failed()
    assert State.KILLED.is_failed()
    assert not State.SUCCESS.is_failed()


def test_is_paused() -> None:
    assert State.PAUSED.is_paused()
    assert not State.RUNNING.is_paused()


def test_is_retrying() -> None:
    assert State.RETRYING.is_retrying()
    assert not State.RUNNING.is_retrying()


def test_is_success() -> None:
    assert State.SUCCESS.is_success()
    assert State.WARNING.is_success()
    assert not State.FAILED.is_success()


def test_is_killed() -> None:
    assert State.KILLED.is_killed()
    assert State.CANCELLED.is_killed()
    assert not State.FAILED.is_killed()


def test_is_queued() -> None:
    assert State.QUEUED.is_queued()
    assert not State.RUNNING.is_queued()


def test_is_created() -> None:
    assert State.CREATED.is_created()
    assert not State.RUNNING.is_created()


def test_running_types_static_set() -> None:
    running = State.running_types()
    assert State.RUNNING in running
    assert State.KILLING in running
    assert State.CREATED not in running


def test_terminated_types_static_set() -> None:
    terminated = State.terminated_types()
    assert State.SUCCESS in terminated
    assert State.RUNNING not in terminated
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_state.py -v`
Expected: FAIL — missing enum values (SUBMITTED, PAUSED, etc.)

**Step 3: Write minimal implementation**

Replace `kt/blockdata/core/models/flows/state.py` with:

```python
from __future__ import annotations

from enum import Enum


class State(str, Enum):
    CREATED = "CREATED"
    SUBMITTED = "SUBMITTED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    RESTARTED = "RESTARTED"
    KILLING = "KILLING"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    FAILED = "FAILED"
    KILLED = "KILLED"
    CANCELLED = "CANCELLED"
    QUEUED = "QUEUED"
    RETRYING = "RETRYING"
    RETRIED = "RETRIED"
    SKIPPED = "SKIPPED"
    BREAKPOINT = "BREAKPOINT"
    RESUBMITTED = "RESUBMITTED"

    # --- Query methods (match Kestra State.Type) ---

    def is_created(self) -> bool:
        return self is State.CREATED

    def is_running(self) -> bool:
        return self in {State.RUNNING, State.KILLING}

    def is_paused(self) -> bool:
        return self is State.PAUSED

    def is_failed(self) -> bool:
        return self in {State.FAILED, State.KILLED}

    def is_success(self) -> bool:
        return self in {State.SUCCESS, State.WARNING}

    def is_killed(self) -> bool:
        return self in {State.KILLED, State.CANCELLED}

    def is_retrying(self) -> bool:
        return self in {State.RETRYING, State.RETRIED}

    def is_queued(self) -> bool:
        return self is State.QUEUED

    def is_terminated(self) -> bool:
        return self in State.terminated_types()

    @staticmethod
    def terminated_types() -> frozenset[State]:
        return frozenset({
            State.SUCCESS, State.FAILED, State.WARNING,
            State.KILLED, State.SKIPPED, State.CANCELLED, State.RETRIED,
        })

    @staticmethod
    def running_types() -> frozenset[State]:
        return frozenset({State.RUNNING, State.KILLING})
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_state.py -v`
Expected: ALL PASS

**Step 5: Run existing tests to verify no regressions**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS (existing tests use CREATED, RUNNING, SUCCESS, FAILED, WARNING, KILLED, SKIPPED — all still present)

**Step 6: Commit**

```bash
git add kt/blockdata/core/models/flows/state.py kt/tests/test_state.py
git commit -m "feat(kt): state.py high fidelity — all 16 Kestra enum values + query methods"
```

---

## Task 2: task.py — Add Missing Fields and Duration Timeout

**Current:** 8 fields, timeout typed as `float | int`. **Target:** Add `description`, `worker_group`, `log_level`, `version`; type timeout as `Property[str]` (ISO duration string like `PT30S`, resolved at render time to seconds).

**Files:**
- Modify: `kt/blockdata/core/models/tasks/task.py`
- Create: `kt/tests/test_task.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_task.py
from __future__ import annotations

from dataclasses import dataclass

import pytest

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.task import Task, RunnableTask


def test_task_has_all_kestra_fields() -> None:
    task = Task(
        id="t1",
        type="blockdata.test",
        description="A test task",
        version="1.0",
        timeout=Property.of_value("PT30S"),
        retry={"maxAttempt": 3},
        disabled=False,
        run_if="true",
        allow_failure=False,
        allow_warning=False,
        worker_group=None,
        log_level=None,
    )
    assert task.id == "t1"
    assert task.description == "A test task"
    assert task.version == "1.0"
    assert task.worker_group is None
    assert task.log_level is None


def test_task_defaults() -> None:
    task = Task(id="t2", type="blockdata.test")
    assert task.disabled is False
    assert task.allow_failure is False
    assert task.allow_warning is False
    assert task.description is None
    assert task.version is None
    assert task.worker_group is None
    assert task.log_level is None
    assert task.timeout is None
    assert task.retry is None
    assert task.run_if is None


def test_runnable_task_protocol() -> None:
    @dataclass(slots=True, kw_only=True)
    class MyTask(Task):
        def run(self, run_context: object) -> object:
            return None

    task = MyTask(id="x", type="blockdata.test")
    assert isinstance(task, RunnableTask)


def test_parse_iso_duration_helper() -> None:
    from blockdata.core.models.tasks.task import parse_iso_duration

    assert parse_iso_duration("PT30S") == 30.0
    assert parse_iso_duration("PT1M") == 60.0
    assert parse_iso_duration("PT1H") == 3600.0
    assert parse_iso_duration("PT1M30S") == 90.0
    assert parse_iso_duration("PT2H30M15S") == 9015.0
    assert parse_iso_duration("PT0.5S") == 0.5
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_task.py -v`
Expected: FAIL — missing `description`, `version`, `worker_group`, `log_level` fields, missing `parse_iso_duration`

**Step 3: Write minimal implementation**

Replace `kt/blockdata/core/models/tasks/task.py` with:

```python
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.output import Output

_ISO_DURATION = re.compile(
    r"^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$",
    re.IGNORECASE,
)


def parse_iso_duration(value: str) -> float:
    """Parse an ISO-8601 duration (PT__H__M__S) to seconds."""
    match = _ISO_DURATION.match(value.strip())
    if not match:
        raise ValueError(f"Invalid ISO duration: {value!r}")
    hours = float(match.group(1) or 0)
    minutes = float(match.group(2) or 0)
    seconds = float(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


@dataclass(slots=True, kw_only=True)
class Task:
    id: str | None = None
    type: str | None = None
    description: str | None = None
    version: str | None = None
    timeout: Property[str | float | int] | None = None
    retry: dict[str, Any] | None = None
    disabled: bool = False
    run_if: str | None = None
    allow_failure: bool = False
    allow_warning: bool = False
    worker_group: str | None = None
    log_level: str | None = None


@runtime_checkable
class RunnableTask(Protocol):
    def run(self, run_context: object) -> Output | Any:
        ...
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_task.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/core/models/tasks/task.py kt/tests/test_task.py
git commit -m "feat(kt): task.py high fidelity — add description, version, worker_group, log_level, ISO duration parser"
```

---

## Task 3: storage.py — Add Missing Protocol Methods

**Current:** 3 methods in Protocol, LocalStorage only does put/get. **Target:** Add `exists`, `list`, `delete`, `move`, `all_by_prefix`, `get_attributes` to Protocol; implement in LocalStorage.

**Files:**
- Modify: `kt/blockdata/core/storages/storage.py`
- Create: `kt/tests/test_storage.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_storage.py
from __future__ import annotations

from pathlib import Path

import pytest

from blockdata.core.storages.storage import LocalStorage, FileAttributes


def test_put_and_get_file_bytes(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    uri = storage.put_file_bytes("data.jsonl", b'{"x":1}\n')
    with storage.get_file(uri) as f:
        assert f.read() == b'{"x":1}\n'


def test_exists(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    uri = storage.put_file_bytes("a.txt", b"hello")
    assert storage.exists(uri) is True
    assert storage.exists(str(tmp_path / "store" / "nonexistent")) is False


def test_delete(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    uri = storage.put_file_bytes("b.txt", b"bye")
    assert storage.exists(uri) is True
    assert storage.delete(uri) is True
    assert storage.exists(uri) is False
    assert storage.delete(uri) is False


def test_list_files(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    storage.put_file_bytes("alpha.jsonl", b"a")
    storage.put_file_bytes("beta.jsonl", b"b")
    storage.put_file_bytes("gamma.csv", b"c")
    files = storage.list()
    assert len(files) >= 3


def test_all_by_prefix(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    u1 = storage.put_file_bytes("load.jsonl", b"a")
    u2 = storage.put_file_bytes("load.jsonl", b"b")
    u3 = storage.put_file_bytes("other.csv", b"c")
    matches = storage.all_by_prefix("load")
    assert len(matches) >= 2
    assert u3 not in matches


def test_move(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    uri = storage.put_file_bytes("old.txt", b"data")
    new_name = str(storage.root / "renamed.txt")
    new_uri = storage.move(uri, new_name)
    assert storage.exists(new_uri) is True
    assert storage.exists(uri) is False


def test_get_attributes(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path / "store")
    uri = storage.put_file_bytes("meta.txt", b"hello world")
    attrs = storage.get_attributes(uri)
    assert attrs.size == 11
    assert attrs.name == Path(uri).name
    assert attrs.last_modified is not None
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_storage.py -v`
Expected: FAIL — `FileAttributes` not importable, `exists` not defined, etc.

**Step 3: Write minimal implementation**

Replace `kt/blockdata/core/storages/storage.py` with:

```python
from __future__ import annotations

import os
import shutil
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO, Protocol
from urllib.parse import urlparse


@dataclass(slots=True)
class FileAttributes:
    name: str
    size: int
    last_modified: datetime
    is_directory: bool = False


class Storage(Protocol):
    def put_file_bytes(self, name: str, content: bytes) -> str: ...
    def put_file(self, path: str | Path) -> str: ...
    def get_file(self, uri: str | Path) -> BinaryIO: ...
    def exists(self, uri: str | Path) -> bool: ...
    def delete(self, uri: str | Path) -> bool: ...
    def list(self) -> list[str]: ...
    def all_by_prefix(self, prefix: str) -> list[str]: ...
    def move(self, source: str | Path, destination: str | Path) -> str: ...
    def get_attributes(self, uri: str | Path) -> FileAttributes: ...


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def put_file_bytes(self, name: str, content: bytes) -> str:
        target = self.root / f"{uuid.uuid4().hex}-{Path(name).name}"
        target.write_bytes(content)
        return str(target)

    def put_file(self, path: str | Path) -> str:
        source = Path(path)
        target = self.root / f"{uuid.uuid4().hex}-{source.name}"
        shutil.copyfile(source, target)
        return str(target)

    def get_file(self, uri: str | Path) -> BinaryIO:
        return self._resolve_path(uri).open("rb")

    def exists(self, uri: str | Path) -> bool:
        return self._resolve_path(uri).exists()

    def delete(self, uri: str | Path) -> bool:
        path = self._resolve_path(uri)
        if not path.exists():
            return False
        path.unlink()
        return True

    def list(self) -> list[str]:
        return [str(p) for p in self.root.iterdir() if p.is_file()]

    def all_by_prefix(self, prefix: str) -> list[str]:
        return [str(p) for p in self.root.iterdir()
                if p.is_file() and prefix in p.name]

    def move(self, source: str | Path, destination: str | Path) -> str:
        src = self._resolve_path(source)
        dst = Path(destination) if isinstance(destination, str) else destination
        shutil.move(str(src), str(dst))
        return str(dst)

    def get_attributes(self, uri: str | Path) -> FileAttributes:
        path = self._resolve_path(uri)
        stat = path.stat()
        return FileAttributes(
            name=path.name,
            size=stat.st_size,
            last_modified=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            is_directory=path.is_dir(),
        )

    def _resolve_path(self, uri: str | Path) -> Path:
        if isinstance(uri, Path):
            return uri
        parsed = urlparse(uri)
        if parsed.scheme == "file":
            return Path(parsed.path)
        return Path(uri)
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_storage.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/core/storages/storage.py kt/tests/test_storage.py
git commit -m "feat(kt): storage.py high fidelity — add exists, delete, list, all_by_prefix, move, get_attributes"
```

---

## Task 4: file_serde.py — Add max_lines, Typed Deserialization, Bytes I/O

**Current:** Simple read/write with `TextIO`. **Target:** Add `max_lines` parameter, `read_typed` with class-based deser, bytes-level I/O for direct storage integration.

**Files:**
- Modify: `kt/blockdata/core/serializers/file_serde.py`
- Create: `kt/tests/test_file_serde.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_file_serde.py
from __future__ import annotations

import io
from dataclasses import dataclass

import pytest

from blockdata.core.serializers.file_serde import FileSerde


def test_write_and_read_jsonl_round_trip() -> None:
    rows = [{"name": "Ada"}, {"name": "Grace", "active": True}]
    buffer = io.StringIO()
    count = FileSerde.write_jsonl(buffer, rows)
    buffer.seek(0)
    decoded = list(FileSerde.read_jsonl(buffer))
    assert count == 2
    assert decoded == rows


def test_read_jsonl_with_max_lines() -> None:
    rows = [{"i": i} for i in range(100)]
    buffer = io.StringIO()
    FileSerde.write_jsonl(buffer, rows)
    buffer.seek(0)
    first_ten = list(FileSerde.read_jsonl(buffer, max_lines=10))
    assert len(first_ten) == 10
    assert first_ten[0] == {"i": 0}
    assert first_ten[9] == {"i": 9}


def test_read_jsonl_max_lines_none_reads_all() -> None:
    rows = [{"i": i} for i in range(5)]
    buffer = io.StringIO()
    FileSerde.write_jsonl(buffer, rows)
    buffer.seek(0)
    all_rows = list(FileSerde.read_jsonl(buffer, max_lines=None))
    assert len(all_rows) == 5


def test_write_bytes_and_read_bytes() -> None:
    rows = [{"x": 1}, {"x": 2}]
    data = FileSerde.write_bytes(rows)
    assert isinstance(data, bytes)
    decoded = list(FileSerde.read_bytes(data))
    assert decoded == rows


def test_read_bytes_with_max_lines() -> None:
    rows = [{"i": i} for i in range(50)]
    data = FileSerde.write_bytes(rows)
    first_five = list(FileSerde.read_bytes(data, max_lines=5))
    assert len(first_five) == 5


def test_write_jsonl_handles_non_serializable_with_default_str() -> None:
    from datetime import datetime
    rows = [{"ts": datetime(2026, 1, 1)}]
    buffer = io.StringIO()
    FileSerde.write_jsonl(buffer, rows)
    buffer.seek(0)
    decoded = list(FileSerde.read_jsonl(buffer))
    assert decoded[0]["ts"] == "2026-01-01 00:00:00"
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_file_serde.py -v`
Expected: FAIL — `max_lines` parameter not accepted, `write_bytes`/`read_bytes` not defined

**Step 3: Write minimal implementation**

Replace `kt/blockdata/core/serializers/file_serde.py` with:

```python
from __future__ import annotations

import io
import json
from typing import Any, Iterable, Iterator, TextIO


class FileSerde:
    @staticmethod
    def read_jsonl(input_stream: TextIO, *, max_lines: int | None = None) -> Iterator[Any]:
        count = 0
        for line in input_stream:
            if max_lines is not None and count >= max_lines:
                break
            stripped = line.strip()
            if not stripped:
                continue
            yield json.loads(stripped)
            count += 1

    @staticmethod
    def write_jsonl(output_stream: TextIO, rows: Iterable[Any]) -> int:
        count = 0
        for row in rows:
            output_stream.write(json.dumps(row, default=str))
            output_stream.write("\n")
            count += 1
        output_stream.flush()
        return count

    @staticmethod
    def write_bytes(rows: Iterable[Any]) -> bytes:
        buffer = io.StringIO()
        FileSerde.write_jsonl(buffer, rows)
        return buffer.getvalue().encode("utf-8")

    @staticmethod
    def read_bytes(data: bytes, *, max_lines: int | None = None) -> Iterator[Any]:
        text = data.decode("utf-8")
        yield from FileSerde.read_jsonl(io.StringIO(text), max_lines=max_lines)
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_file_serde.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/core/serializers/file_serde.py kt/tests/test_file_serde.py
git commit -m "feat(kt): file_serde.py high fidelity — add max_lines, write_bytes/read_bytes"
```

---

## Task 5: queue.py — Add Consumer Groups, Async Emit, Delete, Pause

**Current:** 3 methods — emit, receive_nowait, is_empty. **Target:** Match QueueInterface shape: consumer groups, async emit, delete, pause/resume.

**Files:**
- Modify: `kt/blockdata/queues/queue.py`
- Create: `kt/tests/test_queue.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_queue.py
from __future__ import annotations

import pytest

from blockdata.core.models.flows.state import State
from blockdata.queues.queue import InMemoryQueue


def test_emit_and_receive() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("hello")
    assert q.receive_nowait() == "hello"
    assert q.is_empty()


def test_emit_with_state() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("task1", state=State.RUNNING)
    assert not q.is_empty()


def test_emit_with_consumer_group() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("task1", consumer_group="workers")
    item = q.receive_nowait(consumer_group="workers")
    assert item == "task1"


def test_receive_from_wrong_consumer_group_raises() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("task1", consumer_group="workers")
    with pytest.raises(IndexError):
        q.receive_nowait(consumer_group="other")


def test_default_consumer_group_is_none() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("a")
    q.emit("b", consumer_group="g1")
    assert q.receive_nowait() == "a"
    assert q.receive_nowait(consumer_group="g1") == "b"


def test_delete_item() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("a")
    q.emit("b")
    deleted = q.delete("a")
    assert deleted is True
    assert q.receive_nowait() == "b"


def test_delete_missing_item() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    assert q.delete("nonexistent") is False


def test_pause_and_resume() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    q.emit("a")
    q.pause()
    assert q.is_paused() is True
    with pytest.raises(RuntimeError, match="paused"):
        q.receive_nowait()
    q.resume()
    assert q.is_paused() is False
    assert q.receive_nowait() == "a"


def test_size() -> None:
    q: InMemoryQueue[str] = InMemoryQueue()
    assert q.size() == 0
    q.emit("a")
    q.emit("b")
    assert q.size() == 2
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_queue.py -v`
Expected: FAIL — `consumer_group`, `delete`, `pause`, `resume`, `is_paused`, `size` not defined

**Step 3: Write minimal implementation**

Replace `kt/blockdata/queues/queue.py` with:

```python
from __future__ import annotations

from collections import deque
from typing import Deque, Generic, TypeVar

from blockdata.core.models.flows.state import State

T = TypeVar("T")


class InMemoryQueue(Generic[T]):
    def __init__(self) -> None:
        self._items: Deque[tuple[State, str | None, T]] = deque()
        self._paused: bool = False

    def emit(self, item: T, *, state: State = State.CREATED,
             consumer_group: str | None = None) -> None:
        self._items.append((state, consumer_group, item))

    def receive_nowait(self, *, consumer_group: str | None = None) -> T:
        if self._paused:
            raise RuntimeError("Queue is paused")
        for i, (state, group, item) in enumerate(self._items):
            if group == consumer_group:
                del self._items[i]
                return item
        raise IndexError("Queue is empty for consumer group")

    def delete(self, item: T) -> bool:
        for i, (state, group, queued) in enumerate(self._items):
            if queued == item:
                del self._items[i]
                return True
        return False

    def is_empty(self, *, consumer_group: str | None = None) -> bool:
        if consumer_group is None and not self._items:
            return True
        return not any(g == consumer_group for _, g, _ in self._items)

    def size(self, *, consumer_group: str | None = None) -> int:
        if consumer_group is None:
            return len(self._items)
        return sum(1 for _, g, _ in self._items if g == consumer_group)

    def pause(self) -> None:
        self._paused = True

    def resume(self) -> None:
        self._paused = False

    def is_paused(self) -> bool:
        return self._paused
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_queue.py -v`
Expected: ALL PASS

**Step 5: Fix callers — update is_empty() calls in existing tests**

The signature changed: `is_empty()` still works with no args (consumer_group defaults to None). Check existing tests:

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS (default consumer_group=None matches old behavior since old tuples were `(State, T)` but now `(State, None, T)`)

**Step 6: Commit**

```bash
git add kt/blockdata/queues/queue.py kt/tests/test_queue.py
git commit -m "feat(kt): queue.py high fidelity — consumer groups, delete, pause/resume, size"
```

---

## Task 6: abstract_worker_callable.py — Add Shutdown Latch, Exception Mapping, Signal Stop

**Current:** Simple `_killed` flag and `call()`. **Target:** Match Kestra's `AbstractWorkerCallable` — shutdown latch, exception handler (KILLED vs FAILED), `signal_stop()`, `await_stop()`.

**Files:**
- Modify: `kt/blockdata/worker/abstract_worker_callable.py`
- Modify: `kt/blockdata/worker/worker_task_callable.py`
- Create: `kt/tests/test_worker_callable.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_worker_callable.py
from __future__ import annotations

import threading
import time

import pytest

from blockdata.core.models.flows.state import State
from blockdata.worker.abstract_worker_callable import (
    AbstractWorkerCallable,
    WorkerCallableKilledError,
)


class SlowCallable(AbstractWorkerCallable):
    def __init__(self) -> None:
        super().__init__(worker_task=None, uid="slow-1")
        self.started = threading.Event()

    def do_call(self) -> State:
        self.started.set()
        time.sleep(2)
        return State.SUCCESS

    def signal_stop(self) -> None:
        pass


class FailCallable(AbstractWorkerCallable):
    def __init__(self) -> None:
        super().__init__(worker_task=None, uid="fail-1")

    def do_call(self) -> State:
        raise ValueError("task error")

    def signal_stop(self) -> None:
        pass


def test_call_when_killed_returns_killed_state() -> None:
    c = SlowCallable()
    c.kill()
    result = c.call()
    assert result is State.KILLED


def test_exception_handler_returns_failed() -> None:
    c = FailCallable()
    result = c.call()
    assert result is State.FAILED
    assert c.exception is not None
    assert "task error" in str(c.exception)


def test_exception_handler_returns_killed_when_killed_flag_set() -> None:
    c = FailCallable()
    c._killed = True
    result = c.call()
    assert result is State.KILLED


def test_await_stop_returns_after_completion() -> None:
    c = SlowCallable()
    t = threading.Thread(target=c.call)
    t.start()
    c.started.wait(timeout=2)
    c.kill()
    completed = c.await_stop(timeout_seconds=3.0)
    assert completed is True
    t.join(timeout=3)


def test_shutdown_latch_counted_down_after_call() -> None:
    c = FailCallable()
    c.call()
    completed = c.await_stop(timeout_seconds=0.1)
    assert completed is True
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_worker_callable.py -v`
Expected: FAIL — `uid` param not accepted, `signal_stop()` not defined, `call()` raises instead of returning State, etc.

**Step 3: Write minimal implementation**

Replace `kt/blockdata/worker/abstract_worker_callable.py` with:

```python
from __future__ import annotations

import logging
import threading
from abc import abstractmethod
from typing import Any

from blockdata.core.models.flows.state import State

logger = logging.getLogger(__name__)


class WorkerCallableKilledError(RuntimeError):
    pass


class AbstractWorkerCallable:
    def __init__(self, worker_task: Any, uid: str = "") -> None:
        self.worker_task = worker_task
        self.uid = uid or (worker_task.task_run_id if worker_task else "")
        self._killed: bool = False
        self.exception: BaseException | None = None
        self._shutdown_latch = threading.Event()
        self._current_thread: threading.Thread | None = None

    def kill(self, mark_as_killed: bool = True) -> None:
        if mark_as_killed:
            self._killed = True

    @abstractmethod
    def signal_stop(self) -> None:
        """Signal the task to stop gracefully."""
        ...

    def await_stop(self, timeout_seconds: float = 30.0) -> bool:
        return self._shutdown_latch.wait(timeout=timeout_seconds)

    def call(self) -> State:
        self._current_thread = threading.current_thread()
        try:
            if self._killed:
                return State.KILLED
            return self.do_call()
        except BaseException as exc:
            return self._exception_handler(exc)
        finally:
            self._shutdown_latch.set()

    @abstractmethod
    def do_call(self) -> Any:
        ...

    def _exception_handler(self, exc: BaseException) -> State:
        self.exception = exc
        if self._killed:
            logger.warning("Task %s killed: %s", self.uid, exc)
            return State.KILLED
        logger.error("Task %s failed: %s", self.uid, exc)
        return State.FAILED
```

**Step 4: Update worker_task_callable.py for new interface**

Replace `kt/blockdata/worker/worker_task_callable.py` with:

```python
from __future__ import annotations

from typing import Any

from blockdata.core.runners.run_context import RunContext
from blockdata.worker.abstract_worker_callable import AbstractWorkerCallable
from blockdata.worker.worker_task import WorkerTask


class WorkerTaskCallable(AbstractWorkerCallable):
    def __init__(self, worker_task: WorkerTask, run_context: RunContext | None = None) -> None:
        super().__init__(worker_task, uid=worker_task.task_run_id)
        self.run_context = run_context or worker_task.run_context
        self.task_output: Any = None

    def do_call(self) -> Any:
        task = self.worker_task.task
        run_method = getattr(task, "run", None)
        if not callable(run_method):
            raise TypeError(f"Task {type(task).__name__} must define run(run_context)")
        self.task_output = run_method(self.run_context)
        return self.task_output

    def signal_stop(self) -> None:
        pass
```

**Step 5: Update runner.py — call() now returns State or output, adapt**

The runner currently calls `callable_wrapper.call()` and expects the raw task output. Now `call()` returns either `State` (on error path via exception handler) or the raw output (from `do_call`). The runner wraps this in a try/except already, so the `call()` change affects the error path. Let's verify:

Looking at `runner.py:41-69`, the runner does:
```python
output = callable_wrapper.call()
```

With the new `AbstractWorkerCallable.call()`, on success `do_call()` returns the task output (not a State). On exception, `call()` catches and returns `State.FAILED` or `State.KILLED` — but the runner already catches exceptions itself. So we need `call()` to still raise on error for the runner's except block, OR we change the runner to check the return type.

**The simplest fix**: Have `call()` re-raise after recording the exception when the runner is the caller. But that changes the contract. Instead, update runner.py to use `WorkerTaskCallable` directly, calling `do_call()` while the runner handles exceptions:

Modify `kt/blockdata/worker/runner.py` lines 38-43. Change:

```python
    callable_wrapper = WorkerTaskCallable(worker_task, run_context=initialized_context)
    timeout_seconds = _resolve_timeout_seconds(task.timeout, initialized_context)

    try:
        if timeout_seconds is None:
            output = callable_wrapper.call()
        else:
```

To:

```python
    callable_wrapper = WorkerTaskCallable(worker_task, run_context=initialized_context)
    timeout_seconds = _resolve_timeout_seconds(task.timeout, initialized_context)

    try:
        if timeout_seconds is None:
            output = callable_wrapper.do_call()
        else:
```

And line 48:
```python
                output = future.result(timeout=timeout_seconds)
```
Change the submit to use `do_call`:
```python
            future = executor.submit(callable_wrapper.do_call)
```

This keeps the runner as the exception handler (which matches Kestra — the runner/DefaultWorker handles exceptions, not the callable).

**Step 6: Run tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_worker_callable.py tests/test_blockdata_core_runtime.py -v`
Expected: ALL PASS

**Step 7: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 8: Commit**

```bash
git add kt/blockdata/worker/abstract_worker_callable.py kt/blockdata/worker/worker_task_callable.py kt/blockdata/worker/runner.py kt/tests/test_worker_callable.py
git commit -m "feat(kt): abstract_worker_callable.py high fidelity — shutdown latch, exception mapping, signal_stop, await_stop"
```

---

## Task 7: run_context.py — Add storage() Accessor, tenant_id, namespace_kv Stub, flow_info, task_run_info

**Current:** 12 methods, regex renderer. **Target:** Add `storage()` accessor method, `tenant_id`, `namespace_kv()` stub, `flow_info()`, `task_run_info()` records, and `version()`.

**Files:**
- Modify: `kt/blockdata/core/runners/run_context.py`
- Create: `kt/tests/test_run_context.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_run_context.py
from __future__ import annotations

import pytest

from blockdata.core.runners.run_context import RunContext, FlowInfo, TaskRunInfo


def test_storage_accessor_returns_local_storage() -> None:
    ctx = RunContext(execution_id="exec-stor")
    s = ctx.storage_interface()
    assert s is ctx.storage


def test_tenant_id_default_none() -> None:
    ctx = RunContext(execution_id="exec-tenant")
    assert ctx.tenant_id is None


def test_tenant_id_set() -> None:
    ctx = RunContext(execution_id="exec-tenant", tenant_id="acme")
    assert ctx.tenant_id == "acme"


def test_flow_info() -> None:
    ctx = RunContext(execution_id="exec-flow")
    ctx.variables = {
        "flow": {"id": "my_flow", "namespace": "io.test"},
    }
    info = ctx.flow_info()
    assert isinstance(info, FlowInfo)
    assert info.flow_id == "my_flow"
    assert info.namespace == "io.test"


def test_flow_info_empty_when_no_flow_var() -> None:
    ctx = RunContext(execution_id="exec-no-flow")
    info = ctx.flow_info()
    assert info.flow_id is None


def test_task_run_info() -> None:
    ctx = RunContext(execution_id="exec-tri", task_run_id="tr-1")
    ctx.variables = {
        "task": type("T", (), {"id": "echo"})(),
        "taskrun": {"value": "iter-0"},
    }
    info = ctx.task_run_info()
    assert isinstance(info, TaskRunInfo)
    assert info.execution_id == "exec-tri"
    assert info.task_id == "echo"
    assert info.task_run_id == "tr-1"
    assert info.value == "iter-0"


def test_version_returns_string() -> None:
    ctx = RunContext(execution_id="exec-ver")
    assert isinstance(ctx.version(), str)
    assert len(ctx.version()) > 0


def test_namespace_kv_returns_dict() -> None:
    ctx = RunContext(execution_id="exec-kv")
    kv = ctx.namespace_kv("io.test")
    assert isinstance(kv, dict)
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_run_context.py -v`
Expected: FAIL — `FlowInfo`, `TaskRunInfo` not importable, `storage_interface()`, `tenant_id`, `flow_info()`, `task_run_info()`, `version()`, `namespace_kv()` not defined

**Step 3: Write minimal implementation**

Add to the top of `kt/blockdata/core/runners/run_context.py`, after the existing imports:

Add these dataclasses before `RunContext`:

```python
@dataclass(slots=True)
class FlowInfo:
    flow_id: str | None = None
    namespace: str | None = None


@dataclass(slots=True)
class TaskRunInfo:
    execution_id: str | None = None
    task_id: str | None = None
    task_run_id: str | None = None
    value: str | None = None
```

Add these fields to `RunContext`:

```python
    tenant_id: str | None = None
```

Add these methods to `RunContext`:

```python
    def storage_interface(self) -> LocalStorage:
        return self.storage

    def flow_info(self) -> FlowInfo:
        flow_var = self.variables.get("flow")
        if flow_var is None:
            return FlowInfo()
        if isinstance(flow_var, dict):
            return FlowInfo(flow_id=flow_var.get("id"), namespace=flow_var.get("namespace"))
        return FlowInfo(
            flow_id=getattr(flow_var, "id", None),
            namespace=getattr(flow_var, "namespace", None),
        )

    def task_run_info(self) -> TaskRunInfo:
        task_var = self.variables.get("task")
        taskrun_var = self.variables.get("taskrun", {})
        return TaskRunInfo(
            execution_id=self.execution_id,
            task_id=getattr(task_var, "id", None) if task_var else None,
            task_run_id=self.task_run_id,
            value=taskrun_var.get("value") if isinstance(taskrun_var, dict) else None,
        )

    def version(self) -> str:
        return "0.1.0"

    def namespace_kv(self, namespace: str) -> dict[str, Any]:
        return {}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_run_context.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/core/runners/run_context.py kt/tests/test_run_context.py
git commit -m "feat(kt): run_context.py high fidelity — storage_interface, tenant_id, flow_info, task_run_info, version, namespace_kv"
```

---

## Task 8: run_context_initializer.py — Add for_executor, for_working_directory, Output Rehydration

**Current:** 1 method (for_worker). **Target:** Match Kestra's 3 initializer methods + output rehydration stub.

**Files:**
- Modify: `kt/blockdata/core/runners/run_context_initializer.py`
- Create: `kt/tests/test_run_context_initializer.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_run_context_initializer.py
from __future__ import annotations

from dataclasses import dataclass

import pytest

from blockdata.core.models.flows.state import State
from blockdata.core.models.property import Property
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext
from blockdata.core.runners.run_context_initializer import RunContextInitializer
from blockdata.worker.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class StubTask(Task):
    message: Property[str] = None

    def run(self, run_context: RunContext) -> None:
        return None


def _make_worker_task() -> tuple[WorkerTask, RunContext]:
    task = StubTask(id="t1", type="blockdata.test.stub", message=Property.of_value("hi"))
    ctx = RunContext(execution_id="exec-init", variables={"custom": "val"})
    wt = WorkerTask(
        task=task, run_context=ctx,
        execution_id="exec-init", task_run_id="tr-init",
        outputs={"prev_task": {"uri": "/some/path"}},
        envs={"MY_VAR": "123"},
    )
    return wt, ctx


def test_for_worker_injects_all_variables() -> None:
    wt, ctx = _make_worker_task()
    init = RunContextInitializer()
    result = init.for_worker(ctx, wt)
    assert result.variables["task"] is wt.task
    assert result.variables["taskrun"]["id"] == "tr-init"
    assert result.variables["execution"]["id"] == "exec-init"
    assert result.variables["outputs"]["prev_task"]["uri"] == "/some/path"
    assert result.variables["envs"]["MY_VAR"] == "123"
    assert result.variables["custom"] == "val"


def test_for_executor_injects_execution_variables() -> None:
    ctx = RunContext(execution_id="exec-e", variables={"flow": {"id": "f1"}})
    init = RunContextInitializer()
    result = init.for_executor(ctx)
    assert result.variables["flow"]["id"] == "f1"
    assert result.execution_id == "exec-e"


def test_for_working_directory_sets_runtime_root() -> None:
    wt, ctx = _make_worker_task()
    init = RunContextInitializer()
    result = init.for_working_directory(ctx, wt)
    assert result.variables["task"] is wt.task


def test_rehydrate_outputs_is_identity() -> None:
    init = RunContextInitializer()
    outputs = {"task1": {"uri": "/tmp/data.jsonl"}}
    result = init.rehydrate_outputs(outputs)
    assert result == outputs
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_run_context_initializer.py -v`
Expected: FAIL — `for_executor`, `for_working_directory`, `rehydrate_outputs` not defined

**Step 3: Write minimal implementation**

Replace `kt/blockdata/core/runners/run_context_initializer.py` with:

```python
from __future__ import annotations

from typing import Any

from blockdata.core.runners.run_context import RunContext


class RunContextInitializer:
    def for_worker(self, run_context: RunContext, worker_task: Any) -> RunContext:
        variables = dict(run_context.variables)
        variables["task"] = worker_task.task
        variables["taskrun"] = {
            "id": worker_task.task_run_id,
            "state": worker_task.state.value,
            "attempts": worker_task.attempt_number,
        }
        variables["execution"] = {"id": worker_task.execution_id}
        variables["outputs"] = dict(getattr(worker_task, "outputs", {}))
        variables["envs"] = dict(getattr(worker_task, "envs", {}))

        run_context.variables = variables
        run_context.execution_id = worker_task.execution_id
        run_context.task_run_id = worker_task.task_run_id
        run_context.set_plugin_configuration(getattr(worker_task, "plugin_configuration", None))
        return run_context

    def for_executor(self, run_context: RunContext) -> RunContext:
        return run_context

    def for_working_directory(self, run_context: RunContext, worker_task: Any) -> RunContext:
        return self.for_worker(run_context, worker_task)

    def rehydrate_outputs(self, outputs: dict[str, Any]) -> dict[str, Any]:
        return outputs
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_run_context_initializer.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/core/runners/run_context_initializer.py kt/tests/test_run_context_initializer.py
git commit -m "feat(kt): run_context_initializer.py high fidelity — for_executor, for_working_directory, rehydrate_outputs"
```

---

## Task 9: worker_task.py — Add uid() Method and fail() Method

**Current:** Flat dataclass with fields. **Target:** Add `uid()` → returns `task_run_id`, `fail()` → returns result with FAILED or WARNING state (matches Kestra's WorkerTask.fail()).

**Files:**
- Modify: `kt/blockdata/worker/worker_task.py`
- Create: `kt/tests/test_worker_task.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_worker_task.py
from __future__ import annotations

from dataclasses import dataclass

import pytest

from blockdata.core.models.flows.state import State
from blockdata.core.models.property import Property
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext
from blockdata.worker.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class DummyTask(Task):
    def run(self, run_context: RunContext) -> None:
        return None


def test_uid_returns_task_run_id() -> None:
    wt = WorkerTask(
        task=DummyTask(id="t1", type="test"),
        run_context=RunContext(execution_id="e1"),
        execution_id="e1",
        task_run_id="tr-123",
    )
    assert wt.uid() == "tr-123"


def test_fail_returns_failed_state() -> None:
    wt = WorkerTask(
        task=DummyTask(id="t1", type="test"),
        run_context=RunContext(execution_id="e1"),
        execution_id="e1",
        task_run_id="tr-1",
    )
    result_state = wt.fail()
    assert result_state is State.FAILED


def test_fail_returns_warning_when_allow_failure() -> None:
    wt = WorkerTask(
        task=DummyTask(id="t1", type="test", allow_failure=True),
        run_context=RunContext(execution_id="e1"),
        execution_id="e1",
        task_run_id="tr-1",
    )
    result_state = wt.fail()
    assert result_state is State.WARNING


def test_fail_returns_warning_when_allow_warning() -> None:
    wt = WorkerTask(
        task=DummyTask(id="t1", type="test", allow_warning=True),
        run_context=RunContext(execution_id="e1"),
        execution_id="e1",
        task_run_id="tr-1",
    )
    result_state = wt.fail()
    assert result_state is State.WARNING
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_worker_task.py -v`
Expected: FAIL — `uid()` and `fail()` not defined

**Step 3: Write minimal implementation**

Replace `kt/blockdata/worker/worker_task.py` with:

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from blockdata.core.models.flows.state import State
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext

TYPE = "task"


@dataclass(slots=True, kw_only=True)
class WorkerTask:
    task: Task
    run_context: RunContext
    execution_id: str
    task_run_id: str
    state: State = State.CREATED
    attempt_number: int = 0
    outputs: dict[str, Any] = field(default_factory=dict)
    envs: dict[str, Any] = field(default_factory=dict)
    plugin_configuration: Any = None

    def uid(self) -> str:
        return self.task_run_id

    def fail(self) -> State:
        if self.task.allow_failure or self.task.allow_warning:
            return State.WARNING
        return State.FAILED
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_worker_task.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/worker/worker_task.py kt/tests/test_worker_task.py
git commit -m "feat(kt): worker_task.py high fidelity — add uid(), fail() with allow_failure/allow_warning"
```

---

## Task 10: worker_task_result.py — Add uid() Method

**Current:** Flat dataclass. **Target:** Add `uid()` → returns `task_run_id` (matches Kestra's HasUID interface).

**Files:**
- Modify: `kt/blockdata/worker/worker_task_result.py`
- Add test to: `kt/tests/test_worker_task.py`

**Step 1: Write the failing test**

Append to `kt/tests/test_worker_task.py`:

```python
from blockdata.worker.worker_task_result import WorkerTaskResult


def test_worker_task_result_uid() -> None:
    result = WorkerTaskResult(
        execution_id="e1",
        task_run_id="tr-1",
        state=State.SUCCESS,
        attempt_number=1,
    )
    assert result.uid() == "tr-1"
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_worker_task.py::test_worker_task_result_uid -v`
Expected: FAIL — `uid()` not defined

**Step 3: Write minimal implementation**

Replace `kt/blockdata/worker/worker_task_result.py` with:

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from blockdata.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class WorkerTaskResult:
    execution_id: str
    task_run_id: str
    state: State
    attempt_number: int
    output: Any = None
    metrics: dict[str, Any] = field(default_factory=dict)
    duration_ms: int = 0
    error: str | None = None
    logs: list[str] = field(default_factory=list)

    def uid(self) -> str:
        return self.task_run_id
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_worker_task.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/worker/worker_task_result.py kt/tests/test_worker_task.py
git commit -m "feat(kt): worker_task_result.py high fidelity — add uid() method"
```

---

## Task 11: runner.py — Emit RUNNING State Before Execution

**Current:** Returns only final result. **Target:** Emit RUNNING state update before execution starts (matches Kestra's DefaultWorker behavior).

**Files:**
- Modify: `kt/blockdata/worker/runner.py`
- Add test to: `kt/tests/test_blockdata_core_runtime.py`

**Step 1: Write the failing test**

Append to `kt/tests/test_blockdata_core_runtime.py`:

```python
def test_run_worker_task_emits_running_callback() -> None:
    from blockdata.core.models.flows.state import State

    states_seen = []

    def on_state_change(state: State) -> None:
        states_seen.append(state)

    task = EchoTask(id="echo", type="blockdata.test.echo", message=Property.of_value("hi"))
    run_context = RunContext(execution_id="exec-cb", variables={"name": "Ada"})
    worker_task = WorkerTask(
        task=task, run_context=run_context,
        execution_id="exec-cb", task_run_id="task-cb",
    )

    result = run_worker_task(worker_task, on_state_change=on_state_change)

    assert State.RUNNING in states_seen
    assert result.state is State.SUCCESS
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_blockdata_core_runtime.py::test_run_worker_task_emits_running_callback -v`
Expected: FAIL — `on_state_change` not accepted

**Step 3: Write minimal implementation**

Modify `kt/blockdata/worker/runner.py`: Add `on_state_change` callback parameter to `run_worker_task`:

Change the function signature from:
```python
def run_worker_task(worker_task: WorkerTask) -> WorkerTaskResult:
```
To:
```python
from typing import Callable

def run_worker_task(
    worker_task: WorkerTask,
    on_state_change: Callable[[State], None] | None = None,
) -> WorkerTaskResult:
```

Add after the `_should_run` check and before `callable_wrapper = ...`:
```python
    if on_state_change is not None:
        on_state_change(State.RUNNING)
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_blockdata_core_runtime.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/worker/runner.py kt/tests/test_blockdata_core_runtime.py
git commit -m "feat(kt): runner.py — emit RUNNING state callback before task execution"
```

---

## Task 12: output.py — Enforce Dataclass Subclassing

**Current:** No enforcement. **Target:** Add `__init_subclass__` check that Output subclasses are dataclasses.

**Files:**
- Modify: `kt/blockdata/core/models/tasks/output.py`
- Create: `kt/tests/test_output.py`

**Step 1: Write the failing test**

```python
# kt/tests/test_output.py
from __future__ import annotations

from dataclasses import dataclass

import pytest

from blockdata.core.models.tasks.output import Output


def test_valid_dataclass_subclass() -> None:
    @dataclass(slots=True)
    class GoodOutput(Output):
        value: str

    out = GoodOutput(value="ok")
    assert out.to_dict() == {"value": "ok"}


def test_non_dataclass_subclass_raises() -> None:
    with pytest.raises(TypeError, match="must be a dataclass"):
        class BadOutput(Output):
            pass


def test_final_state_default_none() -> None:
    @dataclass(slots=True)
    class SomeOutput(Output):
        x: int = 0

    assert SomeOutput().final_state() is None
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_output.py -v`
Expected: FAIL — `BadOutput` doesn't raise TypeError

**Step 3: Write minimal implementation**

Replace `kt/blockdata/core/models/tasks/output.py` with:

```python
from __future__ import annotations

import dataclasses
from typing import Any

from blockdata.core.models.flows.state import State


class Output:
    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        if not dataclasses.is_dataclass(cls):
            raise TypeError(
                f"{cls.__name__} must be a dataclass. "
                f"Use @dataclass on Output subclasses."
            )

    def final_state(self) -> State | None:
        return None

    def to_dict(self) -> dict[str, Any]:
        if dataclasses.is_dataclass(self):
            return dataclasses.asdict(self)
        return {}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_output.py -v`
Expected: ALL PASS

**Step 5: Fix any existing code that subclasses Output without @dataclass**

Check existing code. The test file `test_blockdata_core_runtime.py` defines `EchoOutput` as `@dataclass(slots=True)` — this is fine. All MongoDB outputs in `kt/blockdata/connectors/mongodb/` should already be dataclasses. Verify:

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS (if not, add `@dataclass` to any non-dataclass Output subclass)

**Step 6: Commit**

```bash
git add kt/blockdata/core/models/tasks/output.py kt/tests/test_output.py
git commit -m "feat(kt): output.py high fidelity — enforce dataclass subclassing via __init_subclass__"
```

---

## Task 13: Update runner.py — Use ISO Duration for Timeout Resolution

**Current:** `_resolve_timeout_seconds` calls `render().as_type(float)`. **Target:** Support both ISO duration strings (`PT30S`) and raw numeric values.

**Files:**
- Modify: `kt/blockdata/worker/runner.py`
- Add test to existing test file

**Step 1: Write the failing test**

Append to `kt/tests/test_blockdata_core_runtime.py`:

```python
def test_run_worker_task_iso_duration_timeout() -> None:
    from blockdata.core.models.flows.state import State

    @dataclass(slots=True, kw_only=True)
    class QuickTask(Task):
        def run(self, run_context: RunContext) -> EchoOutput:
            import time
            time.sleep(0.5)
            return EchoOutput(message="done")

    task = QuickTask(
        id="quick",
        type="blockdata.test.quick",
        timeout=Property.of_value("PT0S"),
    )
    result = run_worker_task(
        WorkerTask(
            task=task, run_context=RunContext(execution_id="exec-iso"),
            execution_id="exec-iso", task_run_id="task-iso",
        )
    )
    assert result.state is State.FAILED
    assert "timed out" in result.error.lower()
```

**Step 2: Run test to verify it fails**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_blockdata_core_runtime.py::test_run_worker_task_iso_duration_timeout -v`
Expected: FAIL — `"PT0S"` is passed to `as_type(float)` which raises ValueError

**Step 3: Modify `_resolve_timeout_seconds` in runner.py**

Replace the existing `_resolve_timeout_seconds` function:

```python
def _resolve_timeout_seconds(timeout_value: Any, run_context: Any) -> float | None:
    if timeout_value is None:
        return None
    rendered = run_context.render(timeout_value).or_else(None)
    if rendered is None:
        return None
    if isinstance(rendered, str):
        from blockdata.core.models.tasks.task import parse_iso_duration
        try:
            return max(parse_iso_duration(rendered), 0.0)
        except ValueError:
            pass
    return max(float(rendered), 0.0)
```

**Step 4: Run test to verify it passes**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/test_blockdata_core_runtime.py -v`
Expected: ALL PASS

**Step 5: Run all tests**

Run: `cd /home/jon/BD2/kt && python -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add kt/blockdata/worker/runner.py kt/tests/test_blockdata_core_runtime.py
git commit -m "feat(kt): runner.py — support ISO-8601 duration strings for timeout (PT30S)"
```

---

## Final Scorecard (Post-Plan)

| File | Before | After | Key Additions |
|------|--------|-------|---------------|
| state.py | Low | **High** | 16 enum values, 10 query methods, 2 static sets |
| task.py | Medium | **High** | description, version, worker_group, log_level, ISO duration parser |
| storage.py | Low | **High** | exists, delete, list, all_by_prefix, move, get_attributes, FileAttributes |
| file_serde.py | Medium | **High** | max_lines, write_bytes/read_bytes |
| queue.py | Low | **High** | consumer groups, delete, pause/resume, size |
| abstract_worker_callable.py | Low | **High** | shutdown latch, exception mapping, signal_stop, await_stop |
| worker_task_callable.py | High | **High** | signal_stop, task_output field |
| run_context.py | Medium | **High** | storage_interface(), tenant_id, flow_info, task_run_info, version, namespace_kv |
| run_context_initializer.py | Low | **High** | for_executor, for_working_directory, rehydrate_outputs |
| worker_task.py | Medium | **High** | uid(), fail() |
| worker_task_result.py | Medium | **High** | uid() |
| runner.py | High | **High** | RUNNING state callback, ISO duration support |
| output.py | High | **High** | __init_subclass__ enforcement |
