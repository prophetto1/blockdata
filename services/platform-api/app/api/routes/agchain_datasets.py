from __future__ import annotations

import logging
import time
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.dataset_registry import (
    get_dataset_bootstrap,
    get_dataset_detail,
    get_dataset_sample_detail,
    get_dataset_version_mapping,
    get_dataset_version_source,
    get_dataset_version_validation,
    list_dataset_samples,
    list_dataset_versions,
    list_datasets,
)
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/agchain/datasets", tags=["agchain-datasets"])
logger = logging.getLogger("agchain-datasets")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

datasets_detail_duration_ms = meter.create_histogram("agchain.datasets.detail.duration_ms")
datasets_validation_duration_ms = meter.create_histogram("agchain.datasets.validation.duration_ms")


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
                "agchain.project_id": project_id,
                "row_count": len(payload["items"]),
                "latency_ms": duration_ms,
            },
        )
        return payload


@router.get("/new/bootstrap", summary="Load AG chain dataset bootstrap defaults")
async def get_dataset_bootstrap_route(auth: AuthPrincipal = Depends(require_user_auth)):
    with tracer.start_as_current_span("agchain.datasets.new.bootstrap") as span:
        payload = get_dataset_bootstrap(user_id=auth.user_id)
        set_span_attributes(span, {"row_count": len(payload["allowed_source_types"])})
        return payload


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
            "agchain.project_id": project_id,
            "agchain.dataset_id": dataset_id_str,
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
                "agchain.project_id": project_id,
                "agchain.dataset_id": dataset_id_str,
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
                "agchain.dataset_id": dataset_id_str,
                "agchain.dataset_version_id": dataset_version_id_str,
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
                "agchain.dataset_id": dataset_id_str,
                "agchain.dataset_version_id": dataset_version_id_str,
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
            "agchain.dataset_id": dataset_id_str,
            "agchain.dataset_version_id": dataset_version_id_str,
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        datasets_validation_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


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
                "agchain.project_id": project_id,
                "agchain.dataset_id": dataset_id_str,
                "agchain.dataset_version_id": dataset_version_id_str,
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
                "agchain.dataset_id": dataset_id_str,
                "agchain.dataset_version_id": dataset_version_id_str,
            },
        )
        return payload
