"""ArangoDB destination plugin — batch insert. BD-native (no Kestra equivalent)."""
import json as json_mod
from typing import Any

import httpx

from ..domain.plugins.models import BasePlugin, PluginOutput, failed, success
from ..infra.connection import resolve_connection_sync

BATCH_SIZE = 500


class ArangoDBLoadPlugin(BasePlugin):
    """Bulk insert documents into an ArangoDB collection."""

    task_types = ["blockdata.load.arango.batch_insert"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        endpoint = creds["endpoint"].rstrip("/")
        database = creds["database"]
        username = creds["username"]
        password = creds["password"]
        collection = params.get("collection", "")
        documents = params.get("documents", [])
        source_uri = params.get("source_uri", "")
        create_collection = params.get("create_collection", False)

        if not collection:
            return failed("Missing collection name")

        # Load documents from storage artifact if source_uri is provided
        if source_uri and not documents:
            async with httpx.AsyncClient() as dl_client:
                dl_resp = await dl_client.get(source_uri, timeout=120)
                if dl_resp.status_code != 200:
                    return failed(f"Failed to download source artifact: HTTP {dl_resp.status_code}")
                documents = [json_mod.loads(line) for line in dl_resp.text.strip().split("\n") if line.strip()]

        if not documents:
            return failed("No documents to load (provide documents or source_uri)")

        auth = httpx.BasicAuth(username, password)
        base = f"{endpoint}/_db/{database}"

        async with httpx.AsyncClient() as client:
            if create_collection:
                await client.post(f"{base}/_api/collection", json={"name": collection}, auth=auth, timeout=30)

            total_inserted = 0
            total_failed = 0
            errors: list[str] = []

            for i in range(0, len(documents), BATCH_SIZE):
                batch = documents[i:i + BATCH_SIZE]
                resp = await client.post(f"{base}/_api/document/{collection}", json=batch, auth=auth, timeout=60)
                if resp.status_code in (200, 201, 202):
                    results = resp.json()
                    if isinstance(results, list):
                        for r in results:
                            if isinstance(r, dict) and r.get("error"):
                                total_failed += 1
                                errors.append(r.get("errorMessage", "unknown"))
                            else:
                                total_inserted += 1
                    else:
                        total_inserted += len(batch)
                else:
                    total_failed += len(batch)
                    errors.append(f"Batch failed: HTTP {resp.status_code}")

        state = "SUCCESS" if total_failed == 0 else "WARNING"
        return PluginOutput(state=state, data={
            "inserted": total_inserted, "failed": total_failed,
            "collection": collection, "errors": errors[:10],
        }, logs=[f"Inserted {total_inserted}, failed {total_failed} into {collection}"])

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test ArangoDB credentials by checking server version."""
        auth = httpx.BasicAuth(creds["username"], creds["password"])
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{creds['endpoint']}/_db/{creds['database']}/_api/version",
                auth=auth, timeout=10,
            )
        if resp.status_code == 200:
            return success(data={"valid": True, "version": resp.json().get("version")})
        return failed(f"Arango auth failed: HTTP {resp.status_code}")
