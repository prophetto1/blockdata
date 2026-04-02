from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_superuser, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.benchmark_registry import (
    create_benchmark,
    create_benchmark_step,
    delete_benchmark_step,
    get_benchmark_steps,
    get_benchmark_summary,
    list_benchmarks,
    reorder_benchmark_steps,
    update_benchmark_step,
)
from app.domain.agchain.task_registry import (
    create_benchmark_version,
    get_benchmark_tools,
    get_benchmark_version,
    get_resolved_benchmark_tools,
    list_benchmark_versions,
    replace_benchmark_tools,
    validate_benchmark_version,
)
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/agchain/benchmarks", tags=["agchain-benchmarks"])
logger = logging.getLogger("agchain-benchmarks")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

benchmarks_list_counter = meter.create_counter("platform.agchain.benchmarks.list.count")
benchmarks_create_counter = meter.create_counter("platform.agchain.benchmarks.create.count")
benchmarks_get_counter = meter.create_counter("platform.agchain.benchmarks.get.count")
benchmarks_steps_get_counter = meter.create_counter("platform.agchain.benchmarks.steps.get.count")
benchmarks_versions_list_counter = meter.create_counter("platform.agchain.benchmarks.versions.list.count")
benchmarks_versions_create_counter = meter.create_counter("platform.agchain.benchmarks.versions.create.count")
benchmarks_versions_get_counter = meter.create_counter("platform.agchain.benchmarks.versions.get.count")
benchmarks_versions_validate_counter = meter.create_counter("platform.agchain.benchmarks.versions.validate.count")
benchmarks_tools_get_counter = meter.create_counter("platform.agchain.benchmarks.tools.get.count")
benchmarks_tools_replace_counter = meter.create_counter("platform.agchain.benchmarks.tools.replace.count")
benchmarks_steps_create_counter = meter.create_counter("platform.agchain.benchmarks.steps.create.count")
benchmarks_steps_update_counter = meter.create_counter("platform.agchain.benchmarks.steps.update.count")
benchmarks_steps_reorder_counter = meter.create_counter("platform.agchain.benchmarks.steps.reorder.count")
benchmarks_steps_delete_counter = meter.create_counter("platform.agchain.benchmarks.steps.delete.count")

benchmarks_list_duration_ms = meter.create_histogram("platform.agchain.benchmarks.list.duration_ms")
benchmarks_versions_list_duration_ms = meter.create_histogram("platform.agchain.benchmarks.versions.list.duration_ms")
benchmarks_versions_write_duration_ms = meter.create_histogram("platform.agchain.benchmarks.versions.write.duration_ms")
benchmarks_tools_get_duration_ms = meter.create_histogram("platform.agchain.benchmarks.tools.get.duration_ms")
benchmarks_tools_write_duration_ms = meter.create_histogram("platform.agchain.benchmarks.tools.write.duration_ms")
benchmarks_steps_get_duration_ms = meter.create_histogram("platform.agchain.benchmarks.steps.get.duration_ms")
benchmarks_steps_write_duration_ms = meter.create_histogram("platform.agchain.benchmarks.steps.write.duration_ms")


class BenchmarkCreateRequest(BaseModel):
    project_id: str = Field(min_length=1)
    benchmark_name: str = Field(min_length=1)
    benchmark_slug: str | None = None
    description: str = ""


class BenchmarkStepWriteRequest(BaseModel):
    step_id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    step_kind: str = Field(min_length=1)
    api_call_boundary: str = Field(min_length=1)
    inject_payloads: list[str] = Field(default_factory=list)
    scoring_mode: str = Field(min_length=1)
    output_contract: str | None = None
    scorer_ref: str | None = None
    judge_prompt_ref: str | None = None
    judge_grades_step_ids: list[str] = Field(default_factory=list)
    enabled: bool = True
    step_config: dict[str, Any] = Field(default_factory=dict)


class BenchmarkStepUpdateRequest(BaseModel):
    step_id: str | None = None
    display_name: str | None = None
    step_kind: str | None = None
    api_call_boundary: str | None = None
    inject_payloads: list[str] | None = None
    scoring_mode: str | None = None
    output_contract: str | None = None
    scorer_ref: str | None = None
    judge_prompt_ref: str | None = None
    judge_grades_step_ids: list[str] | None = None
    enabled: bool | None = None
    step_config: dict[str, Any] | None = None


class BenchmarkStepReorderRequest(BaseModel):
    ordered_step_ids: list[str] = Field(default_factory=list)


class BenchmarkVersionCreateRequest(BaseModel):
    version_label: str = Field(min_length=1)
    dataset_version_id: str = Field(min_length=1)
    task_name: str | None = None
    task_file_ref: str | None = None
    task_definition_jsonb: dict[str, Any] | None = None
    solver_plan_jsonb: dict[str, Any] = Field(default_factory=dict)
    scorer_refs_jsonb: list[dict[str, Any]] = Field(default_factory=list)
    tool_refs_jsonb: list[dict[str, Any]] = Field(default_factory=list)
    sandbox_profile_id: str | None = None
    sandbox_overrides_jsonb: dict[str, Any] = Field(default_factory=dict)
    model_roles_jsonb: dict[str, Any] = Field(default_factory=dict)
    generate_config_jsonb: dict[str, Any] = Field(default_factory=dict)
    eval_config_jsonb: dict[str, Any] = Field(default_factory=dict)
    publish: bool = False


class BenchmarkVersionValidateRequest(BaseModel):
    benchmark_version_id: str | None = None
    version_label: str | None = None
    dataset_version_id: str | None = None
    task_name: str | None = None
    task_file_ref: str | None = None
    task_definition_jsonb: dict[str, Any] | None = None
    solver_plan_jsonb: dict[str, Any] = Field(default_factory=dict)
    scorer_refs_jsonb: list[dict[str, Any]] = Field(default_factory=list)
    tool_refs_jsonb: list[dict[str, Any]] = Field(default_factory=list)
    sandbox_profile_id: str | None = None
    sandbox_overrides_jsonb: dict[str, Any] = Field(default_factory=dict)
    model_roles_jsonb: dict[str, Any] = Field(default_factory=dict)
    generate_config_jsonb: dict[str, Any] = Field(default_factory=dict)
    eval_config_jsonb: dict[str, Any] = Field(default_factory=dict)


class BenchmarkToolsReplaceRequest(BaseModel):
    benchmark_version_id: str = Field(min_length=1)
    tool_refs: list[dict[str, Any]] = Field(default_factory=list)


@router.get("", summary="List AG chain benchmarks")
async def list_benchmarks_route(
    project_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    state: str | None = Query(default=None),
    validation_status: str | None = Query(default=None),
    has_active_runs: bool | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    cursor: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.list") as span:
        result = list_benchmarks(
            user_id=auth.user_id,
            project_id=project_id,
            search=search,
            state=state,
            validation_status=validation_status,
            has_active_runs=has_active_runs,
            limit=limit,
            cursor=cursor,
            offset=offset,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": project_id is not None,
            "row_count": len(result["items"]),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_list_counter.add(1, safe_attributes(attrs))
        benchmarks_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("", summary="Create an AG chain benchmark")
async def create_benchmark_route(
    body: BenchmarkCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.benchmarks.create") as span:
        result = create_benchmark(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "project_id_present": True,
            "result": "created",
        }
        set_span_attributes(span, attrs)
        benchmarks_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.created",
            extra={
                "benchmark_id": result["benchmark_id"],
                "benchmark_version_id": result["benchmark_version_id"],
                "project_id": body.project_id,
                "subject_id": auth.user_id,
                **safe_attributes(attrs),
            },
        )
        return {"ok": True, **result}


@router.get("/{benchmark_slug}", summary="Get one AG chain benchmark")
async def get_benchmark_route(
    benchmark_slug: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.benchmarks.get") as span:
        result = get_benchmark_summary(user_id=auth.user_id, benchmark_slug=benchmark_slug)
        current_version = result.get("current_version") or {}
        attrs = {
            "project_id_present": bool((result.get("benchmark") or {}).get("project_id")),
            "status": current_version.get("version_status"),
        }
        set_span_attributes(span, attrs)
        benchmarks_get_counter.add(1, safe_attributes(attrs))
        return result


@router.get("/{benchmark_slug}/versions", summary="List AG chain benchmark versions")
async def list_benchmark_versions_route(
    benchmark_slug: str,
    limit: int = Query(default=25, ge=1, le=100),
    cursor: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.versions.list") as span:
        result = list_benchmark_versions(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            limit=limit,
            cursor=cursor,
            offset=offset,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "row_count": len(result.get("items") or []),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_versions_list_counter.add(1, safe_attributes(attrs))
        benchmarks_versions_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/{benchmark_slug}/versions", summary="Create one AG chain benchmark version")
async def create_benchmark_version_route(
    benchmark_slug: str,
    body: BenchmarkVersionCreateRequest,
    auth: AuthPrincipal = Depends(require_superuser),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.versions.create") as span:
        result = create_benchmark_version(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            payload=body.model_dump(),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "result": "created",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_versions_create_counter.add(1, safe_attributes(attrs))
        benchmarks_versions_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return {"ok": True, **result}


@router.get("/{benchmark_slug}/versions/{benchmark_version_id}", summary="Get one AG chain benchmark version")
async def get_benchmark_version_route(
    benchmark_slug: str,
    benchmark_version_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.benchmarks.versions.get") as span:
        result = get_benchmark_version(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            benchmark_version_id=benchmark_version_id,
        )
        attrs = {
            "status": (result.get("benchmark_version") or {}).get("version_status"),
            "project_id_present": bool((result.get("benchmark") or {}).get("project_id")),
        }
        set_span_attributes(span, attrs)
        benchmarks_versions_get_counter.add(1, safe_attributes(attrs))
        return result


@router.get("/{benchmark_slug}/tools", summary="Get benchmark tool bag")
async def get_benchmark_tools_route(
    benchmark_slug: str,
    benchmark_version_id: str = Query(...),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.tools.get") as span:
        result = get_benchmark_tools(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            benchmark_version_id=benchmark_version_id,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "selection_count": len(result.get("tool_refs") or []),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_tools_get_counter.add(1, safe_attributes(attrs))
        benchmarks_tools_get_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.put("/{benchmark_slug}/tools", summary="Replace benchmark tool bag")
async def replace_benchmark_tools_route(
    benchmark_slug: str,
    body: BenchmarkToolsReplaceRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.tools.replace") as span:
        result = replace_benchmark_tools(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            benchmark_version_id=body.benchmark_version_id,
            tool_refs=body.tool_refs,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "selection_count": len(result.get("tool_refs") or []),
            "result": "replaced",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_tools_replace_counter.add(1, safe_attributes(attrs))
        benchmarks_tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.tools_replaced",
            extra=safe_attributes(
                {
                    "selection_count": len(result.get("tool_refs") or []),
                    "result": "replaced",
                }
            ),
        )
        return result


@router.get(
    "/{benchmark_slug}/versions/{benchmark_version_id}/tools/resolved",
    summary="Get resolved benchmark tool manifest",
)
async def get_resolved_benchmark_tools_route(
    benchmark_slug: str,
    benchmark_version_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.tools.get") as span:
        result = get_resolved_benchmark_tools(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            benchmark_version_id=benchmark_version_id,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "tool_count": len(result.get("items") or []),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_tools_get_counter.add(1, safe_attributes(attrs))
        benchmarks_tools_get_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/{benchmark_slug}/validate", summary="Validate one AG chain benchmark version")
async def validate_benchmark_version_route(
    benchmark_slug: str,
    body: BenchmarkVersionValidateRequest,
    auth: AuthPrincipal = Depends(require_superuser),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.versions.validate") as span:
        result = validate_benchmark_version(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            payload=body.model_dump(exclude_none=True, exclude_defaults=True),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "result": result.get("compatibility_summary", {}).get("validation_status", "unknown"),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_versions_validate_counter.add(1, safe_attributes(attrs))
        benchmarks_versions_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return {"ok": True, **result}


@router.get("/{benchmark_slug}/steps", summary="Get ordered benchmark steps")
async def get_benchmark_steps_route(
    benchmark_slug: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.steps.get") as span:
        result = get_benchmark_steps(user_id=auth.user_id, benchmark_slug=benchmark_slug)
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": bool((result.get("benchmark") or {}).get("project_id")),
            "status": (result.get("current_version") or {}).get("version_status"),
            "step_count": len(result.get("steps") or []),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_steps_get_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_get_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/{benchmark_slug}/steps", summary="Create one AG chain benchmark step")
async def create_benchmark_step_route(
    benchmark_slug: str,
    body: BenchmarkStepWriteRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.steps.create") as span:
        result = create_benchmark_step(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            payload=body.model_dump(),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "result": "created",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_steps_create_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.steps.created",
            extra={
                "benchmark_step_id": result["benchmark_step_id"],
                "subject_id": auth.user_id,
                **safe_attributes(attrs),
            },
        )
        return {"ok": True, **result}


@router.patch("/{benchmark_slug}/steps/{benchmark_step_id}", summary="Update one AG chain benchmark step")
async def update_benchmark_step_route(
    benchmark_slug: str,
    benchmark_step_id: str,
    body: BenchmarkStepUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.steps.update") as span:
        payload = body.model_dump(exclude_none=True)
        result = update_benchmark_step(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            benchmark_step_id=benchmark_step_id,
            payload=payload,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "result": "updated",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_steps_update_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.steps.updated",
            extra={
                "benchmark_step_id": result["benchmark_step_id"],
                "subject_id": auth.user_id,
                **safe_attributes(attrs),
            },
        )
        return {"ok": True, **result}


@router.post("/{benchmark_slug}/steps/reorder", summary="Persist a new benchmark step order")
async def reorder_benchmark_steps_route(
    benchmark_slug: str,
    body: BenchmarkStepReorderRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.steps.reorder") as span:
        result = reorder_benchmark_steps(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            ordered_step_ids=body.ordered_step_ids,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "step_count": result["step_count"],
            "result": "reordered",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_steps_reorder_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.steps.reordered",
            extra={
                "subject_id": auth.user_id,
                "step_count": result["step_count"],
                **safe_attributes({"result": "reordered"}),
            },
        )
        return {"ok": True, **result}


@router.delete("/{benchmark_slug}/steps/{benchmark_step_id}", summary="Delete one AG chain benchmark step")
async def delete_benchmark_step_route(
    benchmark_slug: str,
    benchmark_step_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.steps.delete") as span:
        result = delete_benchmark_step(
            user_id=auth.user_id,
            benchmark_slug=benchmark_slug,
            benchmark_step_id=benchmark_step_id,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "result": "deleted",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        benchmarks_steps_delete_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.steps.deleted",
            extra={
                "benchmark_step_id": result["deleted_step_id"],
                "subject_id": auth.user_id,
                **safe_attributes(attrs),
            },
        )
        return {"ok": True, **result}
