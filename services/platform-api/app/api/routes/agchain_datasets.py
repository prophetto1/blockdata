from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.dataset_registry import (
    commit_dataset_version_draft,
    create_dataset,
    create_dataset_version_draft,
    get_dataset_bootstrap,
    get_dataset_detail,
    get_dataset_sample_detail,
    get_dataset_version_draft,
    get_dataset_version_mapping,
    preview_dataset_source,
    preview_dataset_version,
    preview_dataset_version_draft,
    get_dataset_version_source,
    get_dataset_version_validation,
    list_dataset_samples,
    list_dataset_versions,
    list_datasets,
    update_dataset_version_draft,
)
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/agchain/datasets", tags=["agchain-datasets"])
logger = logging.getLogger("agchain-datasets")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

datasets_detail_duration_ms = meter.create_histogram("agchain.datasets.detail.duration_ms")
datasets_validation_duration_ms = meter.create_histogram("agchain.datasets.validation.duration_ms")
datasets_preview_duration_ms = meter.create_histogram("agchain.datasets.preview.duration_ms")
datasets_draft_preview_duration_ms = meter.create_histogram("agchain.datasets.draft_preview.duration_ms")
datasets_preview_requests = meter.create_counter("agchain.datasets.preview.requests")
datasets_drafts_created = meter.create_counter("agchain.datasets.drafts.created")
datasets_drafts_committed = meter.create_counter("agchain.datasets.drafts.committed")
datasets_draft_preview_requests = meter.create_counter("agchain.datasets.draft_preview.requests")
datasets_validation_reruns = meter.create_counter("agchain.datasets.validation.reruns")


class DatasetPreviewRequest(BaseModel):
    project_id: str
    source_type: str
    source_upload_id: str | None = None
    source_uri: str | None = None
    source_config_jsonb: dict[str, Any] = Field(default_factory=dict)
    field_spec_jsonb: dict[str, Any] = Field(default_factory=dict)
    materialization_options_jsonb: dict[str, Any] = Field(default_factory=dict)


class DatasetCreateRequest(DatasetPreviewRequest):
    name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    initial_version_label: str = Field(min_length=1)


class DatasetVersionPreviewRequest(BaseModel):
    refresh: bool = False


class DatasetVersionDraftCreateRequest(BaseModel):
    base_version_id: str


class DatasetVersionDraftUpdateRequest(BaseModel):
    version_label: str | None = None
    source_config_jsonb: dict[str, Any] | None = None
    field_spec_jsonb: dict[str, Any] | None = None
    materialization_options_jsonb: dict[str, Any] | None = None


class DatasetVersionDraftPreviewRequest(BaseModel):
    use_saved: bool = False
    source_config_jsonb: dict[str, Any] | None = None
    field_spec_jsonb: dict[str, Any] | None = None
    materialization_options_jsonb: dict[str, Any] | None = None
    version_label: str | None = None


class DatasetVersionDraftCommitRequest(BaseModel):
    commit_message: str | None = None


def _operation_response(payload: dict[str, Any]):
    if {"operation_id", "operation_type", "status", "poll_url"}.issubset(payload.keys()):
        return JSONResponse(status_code=202, content=payload)
    return payload


@router.get("", summary="List AG chain datasets")
async def list_datasets_route(
    project_id: str = Query(...),
    search: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    validation_status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    cursor: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.datasets.list") as span:
        payload = list_datasets(
            user_id=auth.user_id,
            project_id=project_id,
            search=search,
            source_type=source_type,
            status=status,
            validation_status=validation_status,
            limit=limit,
            cursor=cursor,
            offset=offset,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        set_span_attributes(
            span,
            {
                "project_id_present": True,
                "row_count": len(payload["items"]),
                "latency_ms": duration_ms,
            },
        )
        return payload


@router.get("/new/bootstrap", summary="Load AG chain dataset bootstrap defaults")
async def get_dataset_bootstrap_route(
    project_id: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.new.bootstrap") as span:
        payload = get_dataset_bootstrap(user_id=auth.user_id, project_id=project_id)
        set_span_attributes(
            span,
            {
                "project_id_present": project_id is not None,
                "row_count": len(payload["allowed_source_types"]),
            },
        )
        return payload


@router.post("/new/preview", summary="Preview an AG chain dataset source before create")
async def preview_new_dataset_route(
    body: DatasetPreviewRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.datasets.new.preview") as span:
        payload = preview_dataset_source(user_id=auth.user_id, payload=body.model_dump())
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "source_type": body.source_type,
            "result": "async" if "operation_id" in payload else "sync",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        datasets_preview_requests.add(1, safe_attributes(attrs))
        datasets_preview_duration_ms.record(duration_ms, safe_attributes(attrs))
        return _operation_response(payload)


@router.post("", summary="Create an AG chain dataset and initial version")
async def create_dataset_route(
    body: DatasetCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.datasets.create") as span:
        payload = create_dataset(user_id=auth.user_id, payload=body.model_dump())
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "source_type": body.source_type,
            "result": "async" if "operation_id" in payload else "sync",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        return _operation_response(payload)


@router.get("/{dataset_id}/detail", summary="Get one AG chain dataset workspace")
async def get_dataset_detail_route(
    dataset_id: UUID,
    project_id: str = Query(...),
    version_id: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.datasets.detail.get") as span:
        dataset_id_str = str(dataset_id)
        payload = get_dataset_detail(
            user_id=auth.user_id,
            project_id=project_id,
            dataset_id=dataset_id_str,
            version_id=version_id,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        datasets_detail_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.get("/{dataset_id}/versions", summary="List AG chain dataset versions")
async def list_dataset_versions_route(
    dataset_id: UUID,
    project_id: str = Query(...),
    limit: int = Query(default=50, ge=1),
    cursor: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.versions.list") as span:
        dataset_id_str = str(dataset_id)
        payload = list_dataset_versions(
            user_id=auth.user_id,
            project_id=project_id,
            dataset_id=dataset_id_str,
            limit=limit,
            cursor=cursor,
            offset=offset,
        )
        set_span_attributes(
            span,
            {
                "project_id_present": True,
                "row_count": len(payload["items"]),
            },
        )
        return payload


@router.get(
    "/{dataset_id}/versions/{dataset_version_id}/source",
    summary="Get AG chain dataset version source snapshot",
)
async def get_dataset_version_source_route(
    dataset_id: UUID,
    dataset_version_id: UUID,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.versions.source.get") as span:
        dataset_id_str = str(dataset_id)
        dataset_version_id_str = str(dataset_version_id)
        payload = get_dataset_version_source(
            user_id=auth.user_id,
            dataset_id=dataset_id_str,
            dataset_version_id=dataset_version_id_str,
        )
        set_span_attributes(
            span,
            {
                "project_id_present": False,
            },
        )
        return payload


@router.get(
    "/{dataset_id}/versions/{dataset_version_id}/mapping",
    summary="Get AG chain dataset version field mapping",
)
async def get_dataset_version_mapping_route(
    dataset_id: UUID,
    dataset_version_id: UUID,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.versions.mapping.get") as span:
        dataset_id_str = str(dataset_id)
        dataset_version_id_str = str(dataset_version_id)
        payload = get_dataset_version_mapping(
            user_id=auth.user_id,
            dataset_id=dataset_id_str,
            dataset_version_id=dataset_version_id_str,
        )
        set_span_attributes(
            span,
            {
                "project_id_present": False,
            },
        )
        return payload


@router.get(
    "/{dataset_id}/versions/{dataset_version_id}/validation",
    summary="Get AG chain dataset version validation summary",
)
async def get_dataset_version_validation_route(
    dataset_id: UUID,
    dataset_version_id: UUID,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.datasets.versions.validation.get") as span:
        dataset_id_str = str(dataset_id)
        dataset_version_id_str = str(dataset_version_id)
        payload = get_dataset_version_validation(
            user_id=auth.user_id,
            dataset_id=dataset_id_str,
            dataset_version_id=dataset_version_id_str,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": False,
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        datasets_validation_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.post(
    "/{dataset_id}/versions/{dataset_version_id}/preview",
    summary="Re-run AG chain dataset version preview",
)
async def preview_dataset_version_route(
    dataset_id: UUID,
    dataset_version_id: UUID,
    body: DatasetVersionPreviewRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.versions.preview") as span:
        payload = preview_dataset_version(
            user_id=auth.user_id,
            dataset_id=str(dataset_id),
            dataset_version_id=str(dataset_version_id),
            payload=body.model_dump(),
        )
        attrs = {
            "project_id_present": False,
            "result": "async" if "operation_id" in payload else "sync",
        }
        set_span_attributes(span, attrs)
        datasets_validation_reruns.add(1, safe_attributes(attrs))
        return _operation_response(payload)


@router.post(
    "/{dataset_id}/version-drafts",
    summary="Create an AG chain dataset version draft",
)
async def create_dataset_version_draft_route(
    dataset_id: UUID,
    body: DatasetVersionDraftCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.version_drafts.create") as span:
        payload = create_dataset_version_draft(
            user_id=auth.user_id,
            dataset_id=str(dataset_id),
            payload=body.model_dump(),
        )
        attrs = {"project_id_present": False, "result": "created"}
        set_span_attributes(span, attrs)
        datasets_drafts_created.add(1, safe_attributes(attrs))
        return payload


@router.get(
    "/{dataset_id}/version-drafts/{draft_id}",
    summary="Get an AG chain dataset version draft",
)
async def get_dataset_version_draft_route(
    dataset_id: UUID,
    draft_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.version_drafts.get") as span:
        payload = get_dataset_version_draft(
            user_id=auth.user_id,
            dataset_id=str(dataset_id),
            draft_id=draft_id,
        )
        set_span_attributes(span, {"project_id_present": False})
        return payload


@router.patch(
    "/{dataset_id}/version-drafts/{draft_id}",
    summary="Update an AG chain dataset version draft",
)
async def update_dataset_version_draft_route(
    dataset_id: UUID,
    draft_id: str,
    body: DatasetVersionDraftUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.version_drafts.update") as span:
        payload = update_dataset_version_draft(
            user_id=auth.user_id,
            dataset_id=str(dataset_id),
            draft_id=draft_id,
            payload=body.model_dump(exclude_none=True),
        )
        set_span_attributes(span, {"project_id_present": False, "result": "updated"})
        return payload


@router.post(
    "/{dataset_id}/version-drafts/{draft_id}/preview",
    summary="Preview an AG chain dataset version draft",
)
async def preview_dataset_version_draft_route(
    dataset_id: UUID,
    draft_id: str,
    body: DatasetVersionDraftPreviewRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.datasets.version_drafts.preview") as span:
        payload = preview_dataset_version_draft(
            user_id=auth.user_id,
            dataset_id=str(dataset_id),
            draft_id=draft_id,
            payload=body.model_dump(exclude_none=True),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": False,
            "result": "async" if "operation_id" in payload else "sync",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        datasets_draft_preview_requests.add(1, safe_attributes(attrs))
        datasets_draft_preview_duration_ms.record(duration_ms, safe_attributes(attrs))
        return _operation_response(payload)


@router.post(
    "/{dataset_id}/version-drafts/{draft_id}/commit",
    summary="Commit an AG chain dataset version draft",
)
async def commit_dataset_version_draft_route(
    dataset_id: UUID,
    draft_id: str,
    body: DatasetVersionDraftCommitRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.version_drafts.commit") as span:
        payload = commit_dataset_version_draft(
            user_id=auth.user_id,
            dataset_id=str(dataset_id),
            draft_id=draft_id,
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "project_id_present": False,
            "result": "async" if "operation_id" in payload else "sync",
        }
        set_span_attributes(span, attrs)
        if "operation_id" not in payload:
            datasets_drafts_committed.add(1, safe_attributes(attrs))
        return _operation_response(payload)


@router.get(
    "/{dataset_id}/versions/{dataset_version_id}/samples",
    summary="List AG chain dataset samples for one version",
)
async def list_dataset_samples_route(
    dataset_id: UUID,
    dataset_version_id: UUID,
    project_id: str = Query(...),
    search: str | None = Query(default=None),
    has_setup: bool | None = Query(default=None),
    has_sandbox: bool | None = Query(default=None),
    has_files: bool | None = Query(default=None),
    parse_status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    cursor: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.samples.list") as span:
        dataset_id_str = str(dataset_id)
        dataset_version_id_str = str(dataset_version_id)
        payload = list_dataset_samples(
            user_id=auth.user_id,
            project_id=project_id,
            dataset_id=dataset_id_str,
            dataset_version_id=dataset_version_id_str,
            search=search,
            has_setup=has_setup,
            has_sandbox=has_sandbox,
            has_files=has_files,
            parse_status=parse_status,
            limit=limit,
            cursor=cursor,
            offset=offset,
        )
        set_span_attributes(
            span,
            {
                "project_id_present": True,
                "row_count": len(payload["items"]),
            },
        )
        return payload


@router.get(
    "/{dataset_id}/versions/{dataset_version_id}/samples/{sample_id}",
    summary="Get one AG chain dataset sample",
)
async def get_dataset_sample_route(
    dataset_id: UUID,
    dataset_version_id: UUID,
    sample_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.datasets.samples.get") as span:
        dataset_id_str = str(dataset_id)
        dataset_version_id_str = str(dataset_version_id)
        payload = get_dataset_sample_detail(
            user_id=auth.user_id,
            dataset_id=dataset_id_str,
            dataset_version_id=dataset_version_id_str,
            sample_id=sample_id,
        )
        set_span_attributes(
            span,
            {
                "project_id_present": False,
            },
        )
        return payload
