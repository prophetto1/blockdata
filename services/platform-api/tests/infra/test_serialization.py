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
    assert hasattr(result, '__next__')
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
        return (len(batch) - 1, 1)

    docs = [{"i": i} for i in range(6)]
    result = await chunked_write(docs, writer, chunk_size=3)
    assert result["inserted"] == 4
    assert result["failed"] == 2


@pytest.mark.asyncio
async def test_chunked_write_exception_in_batch():
    """If writer_fn throws, the entire batch is counted as failed."""
    async def writer(batch):
        raise ConnectionError("timeout")

    docs = [{"i": i} for i in range(5)]
    result = await chunked_write(docs, writer, chunk_size=2)
    assert result["inserted"] == 0
    assert result["failed"] == 5
    assert len(result["errors"]) == 3


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
