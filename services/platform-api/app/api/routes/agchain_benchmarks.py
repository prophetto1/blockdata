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
from app.observability.otel import safe_attributes

router = APIRouter(prefix="/agchain/benchmarks", tags=["agchain-benchmarks"])
logger = logging.getLogger("agchain-benchmarks")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

benchmarks_list_counter = meter.create_counter("platform.agchain.benchmarks.list.count")
benchmarks_create_counter = meter.create_counter("platform.agchain.benchmarks.create.count")
benchmarks_get_counter = meter.create_counter("platform.agchain.benchmarks.get.count")
benchmarks_steps_get_counter = meter.create_counter("platform.agchain.benchmarks.steps.get.count")
benchmarks_steps_create_counter = meter.create_counter("platform.agchain.benchmarks.steps.create.count")
benchmarks_steps_update_counter = meter.create_counter("platform.agchain.benchmarks.steps.update.count")
benchmarks_steps_reorder_counter = meter.create_counter("platform.agchain.benchmarks.steps.reorder.count")
benchmarks_steps_delete_counter = meter.create_counter("platform.agchain.benchmarks.steps.delete.count")

benchmarks_list_duration_ms = meter.create_histogram("platform.agchain.benchmarks.list.duration_ms")
benchmarks_steps_get_duration_ms = meter.create_histogram("platform.agchain.benchmarks.steps.get.duration_ms")
benchmarks_steps_write_duration_ms = meter.create_histogram("platform.agchain.benchmarks.steps.write.duration_ms")


class BenchmarkCreateRequest(BaseModel):
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


def _set_span_attrs(span, attrs: dict[str, Any]) -> None:
    for key, value in safe_attributes(attrs).items():
        if value is not None:
            span.set_attribute(key, value)


@router.get("", summary="List AG chain benchmarks")
async def list_benchmarks_route(
    search: str | None = Query(default=None),
    state: str | None = Query(default=None),
    validation_status: str | None = Query(default=None),
    has_active_runs: bool | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.benchmarks.list") as span:
        items = list_benchmarks(user_id=auth.user_id)
        if search:
            needle = search.lower()
            items = [
                item
                for item in items
                if needle in item["benchmark_name"].lower()
                or needle in item["benchmark_slug"].lower()
                or needle in item["description"].lower()
            ]
        if state:
            items = [item for item in items if item["state"] == state]
        if validation_status:
            items = [item for item in items if item["validation_status"] == validation_status]
        if has_active_runs is not None:
            items = [item for item in items if (item["state"] == "running") is has_active_runs]

        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "row_count": len(items),
            "validation_status": validation_status,
            "has_active_runs": has_active_runs,
        }
        _set_span_attrs(span, attrs)
        benchmarks_list_counter.add(1, safe_attributes(attrs))
        benchmarks_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return {"items": items}


@router.post("", summary="Create an AG chain benchmark")
async def create_benchmark_route(
    body: BenchmarkCreateRequest,
    auth: AuthPrincipal = Depends(require_superuser),
):
    with tracer.start_as_current_span("agchain.benchmarks.create") as span:
        result = create_benchmark(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "benchmark_slug": result["benchmark_slug"],
            "result": "created",
        }
        _set_span_attrs(span, attrs)
        benchmarks_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.created",
            extra={
                "benchmark_id": result["benchmark_id"],
                "benchmark_version_id": result["benchmark_version_id"],
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
            "benchmark_slug": benchmark_slug,
            "version_status": current_version.get("version_status"),
            "validation_status": current_version.get("validation_status"),
            "step_count": current_version.get("step_count"),
        }
        _set_span_attrs(span, attrs)
        benchmarks_get_counter.add(1, safe_attributes(attrs))
        return result


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
            "benchmark_slug": benchmark_slug,
            "version_status": (result.get("current_version") or {}).get("version_status"),
            "step_count": len(result.get("steps") or []),
        }
        _set_span_attrs(span, attrs)
        benchmarks_steps_get_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_get_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/{benchmark_slug}/steps", summary="Create one AG chain benchmark step")
async def create_benchmark_step_route(
    benchmark_slug: str,
    body: BenchmarkStepWriteRequest,
    auth: AuthPrincipal = Depends(require_superuser),
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
            "benchmark_slug": benchmark_slug,
            "step_kind": body.step_kind,
            "scoring_mode": body.scoring_mode,
            "api_call_boundary": body.api_call_boundary,
            "result": "created",
        }
        _set_span_attrs(span, attrs)
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
    auth: AuthPrincipal = Depends(require_superuser),
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
            "benchmark_slug": benchmark_slug,
            "step_kind": payload.get("step_kind"),
            "scoring_mode": payload.get("scoring_mode"),
            "api_call_boundary": payload.get("api_call_boundary"),
            "result": "updated",
        }
        _set_span_attrs(span, attrs)
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
    auth: AuthPrincipal = Depends(require_superuser),
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
            "benchmark_slug": benchmark_slug,
            "step_count": result["step_count"],
            "result": "reordered",
        }
        _set_span_attrs(span, attrs)
        benchmarks_steps_reorder_counter.add(1, safe_attributes(attrs))
        benchmarks_steps_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.benchmarks.steps.reordered",
            extra={
                "subject_id": auth.user_id,
                "step_count": result["step_count"],
                **safe_attributes({"benchmark_slug": benchmark_slug, "result": "reordered"}),
            },
        )
        return {"ok": True, **result}


@router.delete("/{benchmark_slug}/steps/{benchmark_step_id}", summary="Delete one AG chain benchmark step")
async def delete_benchmark_step_route(
    benchmark_slug: str,
    benchmark_step_id: str,
    auth: AuthPrincipal = Depends(require_superuser),
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
            "benchmark_slug": benchmark_slug,
            "result": "deleted",
        }
        _set_span_attrs(span, attrs)
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
