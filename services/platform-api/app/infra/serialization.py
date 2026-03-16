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
