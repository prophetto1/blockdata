"""GCS source plugins — List and Download CSV.

Refactored onto substrate: uses resolve_auth (OAuth2ServiceAccount auto-detected),
encode_jsonl for serialization. No inline httpx auth or json.dumps.
"""
import csv
import fnmatch
import io
from typing import Any

import httpx

from ..domain.plugins.models import BasePlugin, PluginOutput, success, failed
from ..infra.auth_providers import resolve_auth
from ..infra.connection import resolve_connection_sync
from ..infra.serialization import encode_jsonl

GCS_API = "https://storage.googleapis.com/storage/v1"


class GCSListPlugin(BasePlugin):
    """List objects in a GCS bucket. Translated from io.kestra.plugin.gcp.gcs.List."""

    task_types = ["blockdata.load.gcs.list_objects", "io.kestra.plugin.gcp.gcs.List"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        auth = await resolve_auth(creds)
        bucket = params["bucket"]
        prefix = params.get("prefix", "")
        glob_pattern = params.get("glob", "*")

        url = f"{GCS_API}/b/{bucket}/o"
        query: dict[str, Any] = {"maxResults": 1000}
        if prefix:
            query["prefix"] = prefix

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=auth.headers, params=query, timeout=30)
            if resp.status_code != 200:
                return failed(f"GCS list failed: HTTP {resp.status_code} — {resp.text[:300]}")
            body = resp.json()

        all_items = body.get("items", [])
        matched = [
            {"name": item["name"], "size": int(item.get("size", 0))}
            for item in all_items
            if fnmatch.fnmatch(item["name"].split("/")[-1], glob_pattern)
        ]

        return success(
            data={"objects": matched, "count": len(matched), "bucket": bucket},
            logs=[f"Found {len(matched)} objects matching {glob_pattern} in gs://{bucket}/{prefix}"],
        )

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test GCS credentials by listing buckets."""
        auth = await resolve_auth(creds)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://storage.googleapis.com/storage/v1/b?project={creds.get('project_id', '')}",
                headers=auth.headers,
                timeout=10,
            )
        if resp.status_code == 200:
            return success(data={"valid": True, "buckets": len(resp.json().get("items", []))})
        return failed(f"GCS auth failed: HTTP {resp.status_code}")


class GCSDownloadCsvPlugin(BasePlugin):
    """Download a CSV from GCS and parse into JSON documents."""

    task_types = ["blockdata.load.gcs.download_csv"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        auth = await resolve_auth(creds)
        bucket = params["bucket"]
        object_name = params["object_name"]
        key_column = params.get("key_column")

        encoded = object_name.replace("/", "%2F")
        url = f"{GCS_API}/b/{bucket}/o/{encoded}?alt=media"

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=auth.headers, timeout=120)
            if resp.status_code != 200:
                return failed(f"GCS download failed: HTTP {resp.status_code}")

        # Parse CSV to JSON documents
        reader = csv.DictReader(io.StringIO(resp.text))
        documents: list[dict[str, str]] = []
        for row in reader:
            doc = dict(row)
            if key_column and key_column in doc:
                doc["_key"] = doc[key_column]
            documents.append(doc)

        # Write JSONL to platform storage via substrate serialization
        storage_path = f"load-artifacts/{context.execution_id}/{object_name.replace('/', '_')}.jsonl"
        storage_uri = await context.upload_file("pipeline", storage_path, encode_jsonl(documents))

        return success(
            data={"storage_uri": storage_uri, "row_count": len(documents), "object_name": object_name},
            logs=[f"Parsed {len(documents)} rows from gs://{bucket}/{object_name} → {storage_uri}"],
        )
