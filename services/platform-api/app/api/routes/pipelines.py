from __future__ import annotations

from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from google.cloud.exceptions import NotFound
from pydantic import BaseModel, Field

from app.api.routes.storage import _assert_project_ownership, _gcs_client
from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.infra.supabase_client import get_supabase_admin
from app.observability.pipeline_metrics import (
    pipeline_tracer,
    record_pipeline_deliverable_download,
    record_pipeline_job_create,
)
from app.pipelines.registry import (
    get_pipeline_definition,
    get_pipeline_worker_definition,
    list_pipeline_definitions as _list_defs,
)

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


class CreatePipelineJobRequest(BaseModel):
    source_uid: str = Field(min_length=1)


def _require_pipeline_definition(pipeline_kind: str) -> dict:
    definition = get_pipeline_definition(pipeline_kind)
    if definition is None:
        raise HTTPException(status_code=404, detail="Unknown pipeline kind")
    return definition


def _query_project_sources(admin, owner_id: str, project_id: str, search: str | None) -> list[dict]:
    query = (
        admin.table("source_documents")
        .select("source_uid, project_id, doc_title, source_type, source_filesize, uploaded_at, source_locator")
        .eq("owner_id", owner_id)
        .eq("project_id", project_id)
        .order("uploaded_at", desc=True)
    )
    if search:
        query = query.ilike("doc_title", f"%{search}%")
    return query.execute().data or []


def _load_owned_source(admin, owner_id: str, source_uid: str) -> dict | None:
    return (
        admin.table("source_documents")
        .select("source_uid, project_id, source_type, doc_title, source_locator")
        .eq("owner_id", owner_id)
        .eq("source_uid", source_uid)
        .maybe_single()
        .execute()
        .data
    )


def _load_active_pipeline_job(admin, owner_id: str, pipeline_kind: str, source_uid: str) -> dict | None:
    return (
        admin.table("pipeline_jobs")
        .select("job_id, status")
        .eq("owner_id", owner_id)
        .eq("pipeline_kind", pipeline_kind)
        .eq("source_uid", source_uid)
        .in_("status", ["queued", "running"])
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
        .data
    )


def _insert_pipeline_job(admin, owner_id: str, pipeline_kind: str, source: dict) -> dict:
    payload = {
        "pipeline_kind": pipeline_kind,
        "owner_id": owner_id,
        "project_id": source.get("project_id"),
        "source_uid": source["source_uid"],
        "status": "queued",
        "stage": "queued",
    }
    result = admin.table("pipeline_jobs").insert(payload).execute().data
    row = result[0] if isinstance(result, list) else result
    return row


def _load_deliverables_for_job(admin, job_id: str) -> list[dict]:
    return (
        admin.table("pipeline_deliverables")
        .select("deliverable_kind, filename, content_type, byte_size, created_at")
        .eq("job_id", job_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )


def _load_latest_job(admin, owner_id: str, pipeline_kind: str, source_uid: str) -> dict | None:
    return (
        admin.table("pipeline_jobs")
        .select("*")
        .eq("owner_id", owner_id)
        .eq("pipeline_kind", pipeline_kind)
        .eq("source_uid", source_uid)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
        .data
    )


def _load_owned_job(admin, owner_id: str, job_id: str) -> dict | None:
    return (
        admin.table("pipeline_jobs")
        .select("*")
        .eq("owner_id", owner_id)
        .eq("job_id", job_id)
        .maybe_single()
        .execute()
        .data
    )


def _load_deliverable_download_record(admin, job_id: str, deliverable_kind: str) -> dict | None:
    deliverable = (
        admin.table("pipeline_deliverables")
        .select("deliverable_kind, filename, content_type, storage_object_id")
        .eq("job_id", job_id)
        .eq("deliverable_kind", deliverable_kind)
        .maybe_single()
        .execute()
        .data
    )
    if not deliverable:
        return None
    storage_object = (
        admin.table("storage_objects")
        .select("bucket, object_key")
        .eq("storage_object_id", deliverable["storage_object_id"])
        .maybe_single()
        .execute()
        .data
    )
    if not storage_object:
        return None
    return {**deliverable, **storage_object}


def _download_storage_bytes(bucket_name: str, object_key: str) -> bytes:
    blob = _gcs_client().bucket(bucket_name).blob(object_key)
    try:
        return blob.download_as_bytes()
    except NotFound as exc:
        raise HTTPException(status_code=404, detail="Deliverable object not found") from exc


def _serialize_deliverable(row: dict) -> dict:
    return {
        "deliverable_kind": row["deliverable_kind"],
        "filename": row["filename"],
        "content_type": row["content_type"],
        "byte_size": row["byte_size"],
        "created_at": row["created_at"],
    }


def _serialize_job(row: dict, deliverables: list[dict]) -> dict:
    return {
        "job_id": row["job_id"],
        "pipeline_kind": row["pipeline_kind"],
        "source_uid": row["source_uid"],
        "status": row["status"],
        "stage": row["stage"],
        "failure_stage": row.get("failure_stage"),
        "error_message": row.get("error_message"),
        "section_count": row.get("section_count"),
        "chunk_count": row.get("chunk_count"),
        "embedding_provider": row.get("embedding_provider"),
        "embedding_model": row.get("embedding_model"),
        "created_at": row.get("created_at"),
        "started_at": row.get("started_at"),
        "claimed_at": row.get("claimed_at"),
        "heartbeat_at": row.get("heartbeat_at"),
        "completed_at": row.get("completed_at"),
        "deliverables": [_serialize_deliverable(item) for item in deliverables],
    }


def _http_status_code(exc: Exception) -> int:
    if isinstance(exc, HTTPException):
        return exc.status_code
    return 500


@router.get("/definitions")
async def list_pipeline_definitions(auth: AuthPrincipal = Depends(require_user_auth)):
    del auth
    with pipeline_tracer.start_as_current_span("pipeline.definitions.list"):
        return {"items": _list_defs()}


@router.get("/{pipeline_kind}/sources")
async def list_pipeline_sources(
    pipeline_kind: str,
    project_id: str,
    search: str | None = None,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with pipeline_tracer.start_as_current_span("pipeline.sources.list") as span:
        span.set_attribute("pipeline.kind", pipeline_kind)
        definition = _require_pipeline_definition(pipeline_kind)
        admin = get_supabase_admin()
        _assert_project_ownership(admin, auth.user_id, project_id)
        service_prefix = f"users/{auth.user_id}/pipeline-services/{definition['storage_service_slug']}/"
        rows = _query_project_sources(admin, auth.user_id, project_id, search)
        items = []
        for row in rows:
            if row.get("source_type") not in definition["eligible_source_types"]:
                continue
            if not str(row.get("object_key") or row.get("source_locator") or "").startswith(service_prefix):
                continue
            items.append(
                {
                    "source_uid": row["source_uid"],
                    "project_id": row["project_id"],
                    "doc_title": row["doc_title"],
                    "source_type": row["source_type"],
                    "content_type": row.get("content_type"),
                    "byte_size": row.get("byte_size", row.get("source_filesize")),
                    "created_at": row.get("created_at", row.get("uploaded_at")),
                }
            )
        items.sort(key=lambda item: item["created_at"] or "", reverse=True)
        return {"items": items}


@router.post("/{pipeline_kind}/jobs", status_code=202)
async def create_pipeline_job(
    pipeline_kind: str,
    body: CreatePipelineJobRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    started = perf_counter()
    with pipeline_tracer.start_as_current_span("pipeline.job.create") as span:
        span.set_attribute("pipeline.kind", pipeline_kind)
        try:
            definition = _require_pipeline_definition(pipeline_kind)
            if get_pipeline_worker_definition(pipeline_kind) is None:
                raise HTTPException(status_code=503, detail="Pipeline kind is not executable yet")
            admin = get_supabase_admin()
            source = _load_owned_source(admin, auth.user_id, body.source_uid)
            if not source:
                raise HTTPException(status_code=404, detail="Source not found")
            if source.get("source_type") not in definition["eligible_source_types"]:
                raise HTTPException(status_code=400, detail="Source type not eligible for pipeline")
            if _load_active_pipeline_job(admin, auth.user_id, pipeline_kind, body.source_uid):
                raise HTTPException(status_code=409, detail="Active job already exists for source")
            row = _insert_pipeline_job(admin, auth.user_id, pipeline_kind, source)
            record_pipeline_job_create(result="ok", pipeline_kind=pipeline_kind, http_status_code=202)
            span.set_attribute("result", "ok")
            span.set_attribute("http.status_code", 202)
            span.set_attribute("duration_ms", (perf_counter() - started) * 1000.0)
            return {
                "job_id": row["job_id"],
                "pipeline_kind": row["pipeline_kind"],
                "source_uid": row["source_uid"],
                "status": row["status"],
                "stage": row["stage"],
            }
        except Exception as exc:
            status = _http_status_code(exc)
            record_pipeline_job_create(result="error", pipeline_kind=pipeline_kind, http_status_code=status)
            span.set_attribute("result", "error")
            span.set_attribute("http.status_code", status)
            raise


@router.get("/{pipeline_kind}/jobs/latest")
async def get_latest_pipeline_job(
    pipeline_kind: str,
    source_uid: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with pipeline_tracer.start_as_current_span("pipeline.job.read") as span:
        span.set_attribute("pipeline.kind", pipeline_kind)
        _require_pipeline_definition(pipeline_kind)
        admin = get_supabase_admin()
        source = _load_owned_source(admin, auth.user_id, source_uid)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        row = _load_latest_job(admin, auth.user_id, pipeline_kind, source_uid)
        if not row:
            return {"job": None}
        deliverables = _load_deliverables_for_job(admin, row["job_id"])
        return {"job": _serialize_job(row, deliverables)}


@router.get("/jobs/{job_id}")
async def get_pipeline_job(job_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    with pipeline_tracer.start_as_current_span("pipeline.job.read") as span:
        admin = get_supabase_admin()
        row = _load_owned_job(admin, auth.user_id, job_id)
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        span.set_attribute("pipeline.kind", row["pipeline_kind"])
        deliverables = _load_deliverables_for_job(admin, job_id)
        return {"job": _serialize_job(row, deliverables)}


@router.get("/jobs/{job_id}/deliverables")
async def list_pipeline_deliverables(job_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    with pipeline_tracer.start_as_current_span("pipeline.deliverables.list") as span:
        admin = get_supabase_admin()
        row = _load_owned_job(admin, auth.user_id, job_id)
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        span.set_attribute("pipeline.kind", row["pipeline_kind"])
        return {"items": [_serialize_deliverable(item) for item in _load_deliverables_for_job(admin, job_id)]}


@router.get("/jobs/{job_id}/deliverables/{deliverable_kind}/download")
async def download_pipeline_deliverable(
    job_id: str,
    deliverable_kind: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with pipeline_tracer.start_as_current_span("pipeline.deliverable.download") as span:
        span.set_attribute("deliverable.kind", deliverable_kind)
        pipeline_kind = "unknown"
        try:
            admin = get_supabase_admin()
            row = _load_owned_job(admin, auth.user_id, job_id)
            if not row:
                raise HTTPException(status_code=404, detail="Job not found")
            pipeline_kind = row["pipeline_kind"]
            span.set_attribute("pipeline.kind", pipeline_kind)
            definition = _require_pipeline_definition(pipeline_kind)
            if deliverable_kind not in definition["deliverable_kinds"]:
                raise HTTPException(status_code=404, detail="Deliverable not found")
            record = _load_deliverable_download_record(admin, job_id, deliverable_kind)
            if not record:
                raise HTTPException(status_code=404, detail="Deliverable not found")
            payload = _download_storage_bytes(record["bucket"], record["object_key"])
            record_pipeline_deliverable_download(
                result="ok",
                pipeline_kind=pipeline_kind,
                deliverable_kind=deliverable_kind,
                http_status_code=200,
            )
            return Response(
                content=payload,
                media_type=record["content_type"],
                headers={"Content-Disposition": f"attachment; filename={record['filename']}"},
            )
        except Exception as exc:
            status = _http_status_code(exc)
            record_pipeline_deliverable_download(
                result="error",
                pipeline_kind=pipeline_kind,
                deliverable_kind=deliverable_kind,
                http_status_code=status,
            )
            span.set_attribute("http.status_code", status)
            raise
