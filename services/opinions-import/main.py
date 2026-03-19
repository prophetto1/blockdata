"""Cloud Run Job: Stream opinions.csv.bz2 from GCS → ArangoDB Cloud.

No local disk needed. Streams GCS blob → bz2 decompress → CSV parse → Arango batch insert.
"""
import bz2
import csv
import io
import os
import re
import sys

from arango import ArangoClient
from google.cloud import storage

GCS_BUCKET = "agchain-case-law"
GCS_BLOB = "opinions.csv.bz2"

ARANGO_ENDPOINT = os.environ.get("ARANGO_URL", "https://b5ce5c7f0236.arangodb.cloud:8529")
ARANGO_DATABASE = os.environ.get("ARANGO_DATABASE", "_system")
ARANGO_USERNAME = os.environ.get("ARANGO_USERNAME", "root")
ARANGO_PASSWORD = os.environ["ARANGO_PASSWORD"]

COLLECTION_NAME = "cl_opinions"
BATCH_SIZE = 50_000
VALID_KEY = re.compile(r"^[a-zA-Z0-9_\-:.@()+,=;$!*'%]+$")

csv.field_size_limit(2**30)


def main():
    # Connect to Arango
    client = ArangoClient(hosts=ARANGO_ENDPOINT)
    db = client.db(ARANGO_DATABASE, username=ARANGO_USERNAME, password=ARANGO_PASSWORD, verify=True)
    print(f"Connected to ArangoDB {db.version()}")

    if not db.has_collection(COLLECTION_NAME):
        db.create_collection(COLLECTION_NAME)
        print(f"Created collection: {COLLECTION_NAME}")
    col = db.collection(COLLECTION_NAME)

    # Stream from GCS — true streaming, no full file in memory
    gcs = storage.Client()
    bucket = gcs.bucket(GCS_BUCKET)
    blob = bucket.blob(GCS_BLOB)
    blob.reload()

    print(f"Streaming gs://{GCS_BUCKET}/{GCS_BLOB} ({blob.size / 1e9:.1f} GB compressed)")

    raw_stream = blob.open("rb")
    decompressor = bz2.BZ2Decompressor()
    leftover = b""

    def line_iter():
        """Yield decoded lines from streaming bz2 decompression."""
        nonlocal leftover
        for chunk in iter(lambda: raw_stream.read(4 * 1024 * 1024), b""):
            try:
                data = decompressor.decompress(chunk)
            except EOFError:
                break
            text = leftover + data
            leftover = b""
            lines = text.split(b"\n")
            leftover = lines.pop()  # incomplete last line
            for line in lines:
                yield line.decode("utf-8", errors="replace")
        if leftover:
            yield leftover.decode("utf-8", errors="replace")

    lines = line_iter()
    header = next(lines)
    fieldnames = next(csv.reader([header]))
    batch = []
    total = 0
    errors = 0

    for line in lines:
        parsed = next(csv.reader([line]))
        if len(parsed) != len(fieldnames):
            continue
        row = dict(zip(fieldnames, parsed))
        if "id" in row and row["id"] and VALID_KEY.match(row["id"]):
            row["_key"] = str(row["id"])
        batch.append(row)

        if len(batch) >= BATCH_SIZE:
            result = col.import_bulk(batch, on_duplicate="replace")
            total += result.get("created", 0) + result.get("updated", 0)
            errors += result.get("errors", 0)
            batch = []
            if total % 500_000 < BATCH_SIZE:
                print(f"  {total:,} imported...", flush=True)

    if batch:
        result = col.import_bulk(batch, on_duplicate="replace")
        total += result.get("created", 0) + result.get("updated", 0)
        errors += result.get("errors", 0)

    print(f"Done. Imported: {total:,}, Errors: {errors:,}")


if __name__ == "__main__":
    main()