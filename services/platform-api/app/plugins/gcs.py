"""GCS source plugins — List and Download CSV. Translated from io.kestra.plugin.gcp.gcs."""
import csv
import fnmatch
import io
import json as json_mod
from typing import Any

import httpx

from ..domain.plugins.models import BasePlugin, PluginOutput, success, failed
from ..infra.connection import resolve_connection_sync
from ..infra.gcs_auth import get_gcs_access_token

GCS_API = "https://storage.googleapis.com/storage/v1"


class GCSListPlugin(BasePlugin):
    """List objects in a GCS bucket. Translated from io.kestra.plugin.gcp.gcs.List."""

    task_types = ["blockdata.load.gcs.list_objects", "io.kestra.plugin.gcp.gcs.List"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        token = get_gcs_access_token(creds)
        bucket = params["bucket"]
        prefix = params.get("prefix", "")
        glob_pattern = params.get("glob", "*")

        headers = {"Authorization": f"Bearer {token}"}
        url = f"{GCS_API}/b/{bucket}/o"
        query: dict[str, Any] = {"maxResults": 1000}
        if prefix:
            query["prefix"] = prefix

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=query, timeout=30)
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
        token = get_gcs_access_token(creds)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://storage.googleapis.com/storage/v1/b?project={creds.get('project_id', '')}",
                headers={"Authorization": f"Bearer {token}"},
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
        token = get_gcs_access_token(creds)
        bucket = params["bucket"]
        object_name = params["object_name"]
        key_column = params.get("key_column")

        headers = {"Authorization": f"Bearer {token}"}
        # URL-encode the object name for the media download endpoint
        encoded = object_name.replace("/", "%2F")
        url = f"{GCS_API}/b/{bucket}/o/{encoded}?alt=media"

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=120)
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

        # Write JSONL to platform storage (artifact handoff contract)
        jsonl_lines = [json_mod.dumps(doc) for doc in documents]
        jsonl_bytes = ("\n".join(jsonl_lines)).encode("utf-8")
        storage_path = f"load-artifacts/{context.execution_id}/{object_name.replace('/', '_')}.jsonl"
        storage_uri = await context.upload_file("pipeline", storage_path, jsonl_bytes)

        return success(
            data={"storage_uri": storage_uri, "row_count": len(documents), "object_name": object_name},
            logs=[f"Parsed {len(documents)} rows from gs://{bucket}/{object_name} → {storage_uri}"],
        )
