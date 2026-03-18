"""Load run orchestration — submit, step, and query load jobs.

The load-run is a composite activity: source function produces artifacts,
destination function consumes them. service_runs tracks the overall run,
service_run_items tracks per-file progress.

Flow:
  POST /load-runs        → validate, list source files, create run + items
  POST /load-runs/{id}/step → process one pending item (download CSV → JSONL → Arango)
  GET  /load-runs/{id}   → return run + items status
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.plugins.models import ExecutionContext
from app.domain.plugins.registry import resolve, resolve_by_function_name
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("load-runs")
router = APIRouter(prefix="/load-runs", tags=["load-runs"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _maybe_finalize_run(sb, run_id: str, log) -> dict:
    """Finalize a run ONLY when all items are terminal (complete or failed).

    Checks for both 'pending' and 'running' items to prevent premature
    completion under concurrent /step calls. Uses persisted rows_affected
    from the run record (not leaked locals) to determine failed vs partial.
    """
    active = sb.table("service_run_items").select(
        "item_id", count="exact", head=True
    ).eq("run_id", run_id).in_("status", ["pending", "running"]).execute()
    active_count = active.count or 0

    if active_count > 0:
        return {"finalized": False, "active": active_count}

    # All items terminal — determine outcome
    run_row = sb.table("service_runs").select(
        "rows_affected"
    ).eq("run_id", run_id).single().execute()
    total_items = run_row.data.get("rows_affected", 0) if run_row.data else 0

    failed = sb.table("service_run_items").select(
        "item_id", count="exact", head=True
    ).eq("run_id", run_id).eq("status", "failed").execute()
    failed_count = failed.count or 0

    if failed_count == 0:
        final_status = "complete"
    elif total_items > 0 and failed_count >= total_items:
        final_status = "failed"
    else:
        final_status = "partial"

    sb.table("service_runs").update({
        "status": final_status, "completed_at": _now(),
    }).eq("run_id", run_id).execute()

    # Clean up ephemeral artifacts on full success
    if final_status == "complete":
        try:
            _cleanup_artifacts(sb, run_id)
        except Exception as e:
            log.warning(f"Artifact cleanup failed for run {run_id}: {e}")

    return {"finalized": True, "status": final_status, "active": 0}


def _cleanup_artifacts(sb, run_id: str):
    """Delete JSONL artifacts from pipeline storage after successful run.

    Uses the Supabase Storage API: list objects by prefix, then remove them.
    """
    prefix = f"load-artifacts/{run_id}/"
    listed = sb.storage.from_("pipeline").list(prefix)
    if listed:
        paths = [f"{prefix}{f['name']}" for f in listed]
        sb.storage.from_("pipeline").remove(paths)


def _validate_owned_project(sb, project_id: str | None, user_id: str) -> None:
    """Reject bogus or unowned project_id values."""
    if not project_id:
        return
    project = sb.table("projects").select("project_id").eq(
        "project_id", project_id
    ).eq("owner_id", user_id).maybe_single().execute()
    if not project.data:
        raise HTTPException(403, "Project not found or not owned by caller")


class SubmitLoadRequest(BaseModel):
    source_function_name: str
    source_download_function: str
    source_connection_id: str
    dest_function_name: str
    dest_connection_id: str
    project_id: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)


@router.post("", summary="Submit a new load run")
async def submit_load(body: SubmitLoadRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    """Create a load run: list source files, create run + items."""
    sb = get_supabase_admin()

    # 0. Validate project ownership if project_id is provided
    _validate_owned_project(sb, body.project_id, auth.user_id)

    # 1. Validate source and destination functions
    src_fn = sb.table("service_functions").select("*").eq(
        "function_name", body.source_function_name).single().execute()
    if not src_fn.data or src_fn.data.get("bd_stage") != "source":
        raise HTTPException(400, "Source function not found or not a source-stage function")

    dst_fn = sb.table("service_functions").select("*").eq(
        "function_name", body.dest_function_name).single().execute()
    if not dst_fn.data or dst_fn.data.get("bd_stage") != "destination":
        raise HTTPException(400, "Destination function not found or not a destination-stage function")

    # 2. Call the source list function to discover files
    list_task_type = resolve_by_function_name(body.source_function_name)
    if not list_task_type:
        raise HTTPException(400, f"Source function '{body.source_function_name}' not found in plugin registry")
    list_plugin = resolve(list_task_type)
    if not list_plugin:
        raise HTTPException(500, f"No handler for source function '{body.source_function_name}'")

    exec_id = str(uuid.uuid4())
    ctx = ExecutionContext(execution_id=exec_id, user_id=auth.user_id)
    list_result = await list_plugin.run({
        "connection_id": body.source_connection_id,
        "bucket": body.config.get("bucket", ""),
        "prefix": body.config.get("prefix", ""),
        "glob": body.config.get("glob", "*.csv"),
    }, ctx)

    if list_result.state != "SUCCESS":
        raise HTTPException(400, f"Source listing failed: {list_result.logs}")

    objects = list_result.data.get("objects", [])
    if not objects:
        raise HTTPException(400, "No files found matching the source configuration")

    # 3. Create the composite run (set created_by for RLS ownership).
    # rows_affected is set atomically in the INSERT — no separate UPDATE.
    run_id = str(uuid.uuid4())
    sb.table("service_runs").insert({
        "run_id": run_id,
        "function_id": src_fn.data["function_id"],
        "service_id": src_fn.data["service_id"],
        "dest_function_id": dst_fn.data["function_id"],
        "dest_service_id": dst_fn.data["service_id"],
        "project_id": body.project_id,
        "created_by": auth.user_id,
        "status": "pending",
        "rows_affected": len(objects),
        "config_snapshot": {
            "source_function_name": body.source_function_name,
            "source_download_function": body.source_download_function,
            "source_connection_id": body.source_connection_id,
            "dest_load_function": body.dest_function_name,
            "dest_connection_id": body.dest_connection_id,
            **body.config,
        },
        "started_at": _now(),
    }).execute()

    # 4. Create one item per discovered file.
    # Run creation and item creation should be atomic. If item insert fails,
    # compensate by marking the run failed so no orphaned pending run remains.
    items = [
        {
            "run_id": run_id,
            "item_key": obj["name"],
            "item_type": "file",
            "status": "pending",
        }
        for obj in objects
    ]
    try:
        sb.table("service_run_items").insert(items).execute()
    except Exception as e:
        sb.table("service_runs").update({
            "status": "failed",
            "error_message": f"Item creation failed: {str(e)[:500]}",
            "completed_at": _now(),
        }).eq("run_id", run_id).execute()
        raise HTTPException(500, f"Failed to create run items: {str(e)[:200]}")

    return {"run_id": run_id, "status": "pending", "total_items": len(items)}


@router.post("/{run_id}/step", summary="Process next pending item in a load run")
async def step_load(run_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    """Process the next pending item in the load run.

    1. Claim one pending item
    2. Download CSV from GCS → parse → write JSONL to storage
    3. Load JSONL into Arango
    4. Mark item complete or failed
    5. If no pending items remain, mark run complete
    """
    sb = get_supabase_admin()

    # Load the run and verify ownership (service-role bypasses RLS)
    run = sb.table("service_runs").select("*").eq("run_id", run_id).single().execute()
    if not run.data:
        raise HTTPException(404, "Run not found")
    if run.data.get("created_by") != auth.user_id:
        raise HTTPException(403, "Not your run")
    if run.data["status"] in ("complete", "partial", "failed", "cancelled"):
        return {"run_id": run_id, "status": run.data["status"], "message": "Run already finished"}

    config = run.data.get("config_snapshot", {})

    # Mark run as running if it was pending
    if run.data["status"] == "pending":
        sb.table("service_runs").update({"status": "running"}).eq("run_id", run_id).execute()

    # Claim one pending item atomically via RPC (prevents double-claiming)
    claimed = sb.rpc("claim_run_item", {"p_run_id": run_id, "p_limit": 1}).execute()
    if not claimed.data:
        # No pending items — but other items may still be 'running' under
        # concurrent /step calls. Try to finalize; if items are still active
        # the helper will return without stamping.
        result = _maybe_finalize_run(sb, run_id, logger)
        return {"run_id": run_id, "status": result.get("status", "running"), "remaining": result.get("active", 0)}

    item = claimed.data[0]
    item_id = item["item_id"]
    object_name = item["item_key"]

    try:
        # Step A: Download CSV from GCS and write JSONL to storage
        src_download_fn = config.get("source_download_function", "gcs_download_csv")
        dst_load_fn = config.get("dest_load_function", "arangodb_load")

        download_task_type = resolve_by_function_name(src_download_fn)
        if not download_task_type:
            raise Exception(f"Source download function '{src_download_fn}' not found in plugin registry")
        download_plugin = resolve(download_task_type)
        if not download_plugin:
            raise Exception(f"No handler for source download task type: {download_task_type}")
        ctx = ExecutionContext(execution_id=f"{run_id}/{item_id}", user_id=auth.user_id)
        download_result = await download_plugin.run({
            "connection_id": config["source_connection_id"],
            "bucket": config.get("bucket", ""),
            "object_name": object_name,
            "key_column": config.get("key_column"),
        }, ctx)

        if download_result.state != "SUCCESS":
            raise Exception(f"Download failed: {download_result.logs}")

        storage_uri = download_result.data["storage_uri"]
        row_count = download_result.data["row_count"]

        # Step B: Load JSONL into destination
        load_task_type = resolve_by_function_name(dst_load_fn)
        if not load_task_type:
            raise Exception(f"Destination load function '{dst_load_fn}' not found in plugin registry")
        load_plugin = resolve(load_task_type)
        if not load_plugin:
            raise Exception(f"No handler for destination task type: {load_task_type}")
        load_result = await load_plugin.run({
            "connection_id": config["dest_connection_id"],
            "collection": config.get("collection", ""),
            "source_uri": storage_uri,
            "create_collection": config.get("create_collection", False),
        }, ctx)

        if load_result.state == "FAILED":
            raise Exception(f"Load failed: {load_result.logs}")

        # Mark item complete
        sb.table("service_run_items").update({
            "status": "complete",
            "rows_written": load_result.data.get("inserted", 0),
            "rows_failed": load_result.data.get("failed", 0),
            "storage_uri": storage_uri,
            "completed_at": _now(),
        }).eq("item_id", item_id).execute()

    except Exception as e:
        logger.error(f"Load step failed for item {item_id}: {e}")
        sb.table("service_run_items").update({
            "status": "failed",
            "error_message": str(e)[:1000],
            "completed_at": _now(),
        }).eq("item_id", item_id).execute()

    # Try to finalize the run. The helper checks for BOTH pending and running
    # items, so concurrent /step calls won't stamp complete prematurely.
    result = _maybe_finalize_run(sb, run_id, logger)
    return {"run_id": run_id, "processed": object_name, "remaining": result.get("active", 0)}


@router.get("/{run_id}", summary="Get load run status and item details")
async def get_load_run(run_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    run = sb.table("service_runs").select("*").eq("run_id", run_id).single().execute()
    if not run.data:
        raise HTTPException(404, "Run not found")
    if run.data.get("created_by") != auth.user_id:
        raise HTTPException(403, "Not your run")
    items = sb.table("service_run_items").select("*").eq("run_id", run_id).order("item_key").execute()
    return {"run": run.data, "items": items.data or []}
