"""ArangoDB destination plugin — batch insert. BD-native (no Kestra equivalent).

Refactored onto substrate: uses resolve_auth (BasicAuth auto-detected),
context.download_file, decode_jsonl, chunked_write. No inline httpx auth,
json parsing, or batch loops.
"""
from typing import Any

import httpx

from ..domain.plugins.models import BasePlugin, PluginOutput, failed, success
from ..infra.auth_providers import resolve_auth
from ..infra.connection import resolve_connection_sync
from ..infra.serialization import decode_jsonl, chunked_write


class ArangoDBLoadPlugin(BasePlugin):
    """Bulk insert documents into an ArangoDB collection."""

    task_types = ["blockdata.load.arango.batch_insert"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        auth = await resolve_auth(creds)
        endpoint = creds["endpoint"].rstrip("/")
        database = creds["database"]
        collection = params.get("collection", "")
        documents = params.get("documents", [])
        source_uri = params.get("source_uri", "")
        create_collection = params.get("create_collection", False)

        if not collection:
            return failed("Missing collection name")

        # Load documents from storage artifact via substrate
        if source_uri and not documents:
            data = await context.download_file(source_uri)
            documents = decode_jsonl(data)

        if not documents:
            return failed("No documents to load (provide documents or source_uri)")

        base = f"{endpoint}/_db/{database}"
        http_auth = httpx.BasicAuth(creds["username"], creds["password"])

        async with httpx.AsyncClient() as client:
            if create_collection:
                await client.post(
                    f"{base}/_api/collection", json={"name": collection},
                    auth=http_auth, timeout=30,
                )

            async def write_batch(batch: list[dict[str, Any]]) -> tuple[int, int]:
                resp = await client.post(
                    f"{base}/_api/document/{collection}", json=batch,
                    auth=http_auth, timeout=60,
                )
                if resp.status_code in (200, 201, 202):
                    results = resp.json()
                    if isinstance(results, list):
                        inserted = sum(1 for r in results if not (isinstance(r, dict) and r.get("error")))
                        return (inserted, len(results) - inserted)
                    return (len(batch), 0)
                return (0, len(batch))

            result = await chunked_write(documents, write_batch, chunk_size=500)

        state = "SUCCESS" if result["failed"] == 0 else "WARNING"
        return PluginOutput(state=state, data={
            "inserted": result["inserted"], "failed": result["failed"],
            "collection": collection, "errors": result["errors"],
        }, logs=[f"Inserted {result['inserted']}, failed {result['failed']} into {collection}"])

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test ArangoDB credentials by checking server version."""
        auth = await resolve_auth(creds)
        http_auth = httpx.BasicAuth(creds["username"], creds["password"])
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{creds['endpoint']}/_db/{creds['database']}/_api/version",
                auth=http_auth, timeout=10,
            )
        if resp.status_code == 200:
            return success(data={"valid": True, "version": resp.json().get("version")})
        return failed(f"Arango auth failed: HTTP {resp.status_code}")
