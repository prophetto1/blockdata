"""Traced from Java imports in AbstractLoad.java and Find.java:

  import io.kestra.core.serializers.FileSerde;        → encode_jsonl, decode_jsonl
  import io.kestra.core.serializers.JacksonMapper;     → json.dumps / json.loads

Kestra uses Ion binary format via FileSerde for internal storage.
BD uses JSONL (newline-delimited JSON) via msgspec or stdlib json.
Same purpose: serialize rows for inter-step transfer.
"""
from __future__ import annotations

import json
from typing import Any


def encode_jsonl(rows: list[dict[str, Any]]) -> bytes:
    """FileSerde.writeAll(output, flux) → write list of dicts as JSONL bytes.

    AbstractLoad.java:88 — flowable.count().block() after writing
    Find.java:196 — FileSerde.writeAll(output, flux).block()
    """
    lines = [json.dumps(row, default=str) for row in rows]
    return ("\n".join(lines) + "\n").encode("utf-8")


def decode_jsonl(data: bytes) -> list[dict[str, Any]]:
    """FileSerde.readAll(inputStream) → read JSONL bytes into list of dicts.

    Load.java:92 — FileSerde.readAll(inputStream).map(...)
    Bulk.java:91 — input.readLine() in a while loop
    """
    rows = []
    for line in data.decode("utf-8").strip().split("\n"):
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def chunked_write(
    documents: list[dict[str, Any]],
    writer_fn,
    chunk_size: int = 1000,
) -> dict[str, Any]:
    """AbstractLoad.java:70-88 — .buffer(chunk, chunk).map(bulkWrite)

    Generic chunked writer. Calls writer_fn(batch) for each chunk.
    Returns aggregated counts.

    Used by ArangoDBLoadPlugin (existing) and can be used by any
    destination plugin that does batched writes.
    """
    import asyncio

    total = len(documents)
    inserted = 0
    fail = 0
    errors: list[str] = []

    async def _run():
        nonlocal inserted, fail
        for i in range(0, total, chunk_size):
            batch = documents[i : i + chunk_size]
            try:
                batch_inserted, batch_failed = await writer_fn(batch)
                inserted += batch_inserted
                fail += batch_failed
            except Exception as e:
                fail += len(batch)
                errors.append(str(e))

    asyncio.get_event_loop().run_until_complete(_run())
    return {"inserted": inserted, "failed": fail, "errors": errors}
