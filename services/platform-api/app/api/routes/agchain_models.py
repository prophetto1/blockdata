from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_superuser, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain import (
    create_model_target,
    list_model_targets,
    list_supported_providers,
    load_model_detail,
    refresh_model_target_health,
    resolve_provider_definition,
    update_model_target,
)
from app.observability.otel import safe_attributes

router = APIRouter(prefix="/agchain/models", tags=["agchain-models"])
logger = logging.getLogger("agchain-models")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

providers_list_counter = meter.create_counter("platform.agchain.models.providers.list.count")
models_list_counter = meter.create_counter("platform.agchain.models.list.count")
models_create_counter = meter.create_counter("platform.agchain.models.create.count")
models_update_counter = meter.create_counter("platform.agchain.models.update.count")
models_refresh_counter = meter.create_counter("platform.agchain.models.refresh_health.count")
models_list_duration_ms = meter.create_histogram("platform.agchain.models.list.duration_ms")
models_refresh_duration_ms = meter.create_histogram("platform.agchain.models.refresh_health.duration_ms")


class ModelTargetCreateRequest(BaseModel):
    label: str = Field(min_length=1)
    provider_slug: str = Field(min_length=1)
    provider_qualifier: str | None = None
    model_name: str = Field(min_length=1)
    qualified_model: str = Field(min_length=1)
    api_base: str | None = None
    auth_kind: str = Field(min_length=1)
    credential_source_jsonb: dict[str, Any] = Field(default_factory=dict)
    model_args_jsonb: dict[str, Any] = Field(default_factory=dict)
    supports_evaluated: bool = True
    supports_judge: bool = False
    capabilities_jsonb: dict[str, Any] = Field(default_factory=dict)
    probe_strategy: str = "provider_default"
    notes: str | None = None
    enabled: bool = True


class ModelTargetUpdateRequest(BaseModel):
    label: str | None = None
    api_base: str | None = None
    auth_kind: str | None = None
    credential_source_jsonb: dict[str, Any] | None = None
    model_args_jsonb: dict[str, Any] | None = None
    supports_evaluated: bool | None = None
    supports_judge: bool | None = None
    capabilities_jsonb: dict[str, Any] | None = None
    probe_strategy: str | None = None
    notes: str | None = None
    enabled: bool | None = None


def _set_span_attrs(span, attrs: dict[str, Any]) -> None:
    for key, value in safe_attributes(attrs).items():
        if value is not None:
            span.set_attribute(key, value)


@router.get("/providers", summary="List supported AG chain model providers")
async def list_supported_providers_route(auth: AuthPrincipal = Depends(require_user_auth)):
    with tracer.start_as_current_span("agchain.models.providers.list") as span:
        providers = list_supported_providers()
        attrs = {"row_count": len(providers)}
        _set_span_attrs(span, attrs)
        providers_list_counter.add(1, safe_attributes(attrs))
        return {"items": providers}


@router.get("", summary="List AG chain model targets")
async def list_models(
    provider_slug: str | None = Query(default=None),
    compatibility: str | None = Query(default=None),
    health_status: str | None = Query(default=None),
    enabled: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.models.list") as span:
        items = list_model_targets(
            user_id=auth.user_id,
            provider_slug=provider_slug,
            compatibility=compatibility,
            health_status=health_status,
            enabled=enabled,
            search=search,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "filter.provider_slug_present": provider_slug is not None,
            "filter.compatibility": compatibility,
            "filter.health_status": health_status,
            "row_count": len(items),
            "latency_ms": duration_ms,
        }
        _set_span_attrs(span, attrs)
        models_list_counter.add(1, safe_attributes(attrs))
        models_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return {"items": items}


@router.get("/{model_target_id}", summary="Get one AG chain model target")
async def get_model(
    model_target_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.models.get") as span:
        model_target, recent_health_checks = load_model_detail(
            user_id=auth.user_id,
            model_target_id=model_target_id,
        )
        if model_target is None:
            raise HTTPException(status_code=404, detail="AG chain model target not found")
        provider_definition = resolve_provider_definition(model_target["provider_slug"])
        _set_span_attrs(
            span,
            {
                "provider_slug": model_target["provider_slug"],
                "auth_kind": model_target["auth_kind"],
                "health_status": model_target["health_status"],
            },
        )
        return {
            "model_target": model_target,
            "recent_health_checks": recent_health_checks,
            "provider_definition": provider_definition,
        }


@router.post("", summary="Create an AG chain model target")
async def create_model(
    body: ModelTargetCreateRequest,
    auth: AuthPrincipal = Depends(require_superuser),
):
    with tracer.start_as_current_span("agchain.models.create") as span:
        model_target_id = create_model_target(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "provider_slug": body.provider_slug,
            "auth_kind": body.auth_kind,
            "supports_evaluated": body.supports_evaluated,
            "supports_judge": body.supports_judge,
            "enabled": body.enabled,
        }
        _set_span_attrs(span, attrs)
        models_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.created",
            extra={"model_target_id": model_target_id, "subject_id": auth.user_id, **safe_attributes(attrs)},
        )
        return {"ok": True, "model_target_id": model_target_id}


@router.patch("/{model_target_id}", summary="Update an AG chain model target")
async def patch_model(
    model_target_id: str,
    body: ModelTargetUpdateRequest,
    auth: AuthPrincipal = Depends(require_superuser),
):
    with tracer.start_as_current_span("agchain.models.update") as span:
        model_target_id = update_model_target(
            user_id=auth.user_id,
            model_target_id=model_target_id,
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "enabled": body.enabled,
            "auth_kind": body.auth_kind,
            "probe_strategy": body.probe_strategy,
        }
        _set_span_attrs(span, attrs)
        models_update_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.updated",
            extra={"model_target_id": model_target_id, "subject_id": auth.user_id, **safe_attributes(attrs)},
        )
        return {"ok": True, "model_target_id": model_target_id}


@router.post("/{model_target_id}/refresh-health", summary="Refresh health for an AG chain model target")
async def refresh_model_health(
    model_target_id: str,
    auth: AuthPrincipal = Depends(require_superuser),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.models.refresh_health") as span:
        outcome = await refresh_model_target_health(user_id=auth.user_id, model_target_id=model_target_id)
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "health_status": outcome["health_status"],
            "probe_strategy": outcome["probe_strategy"],
            "result": outcome["health_status"],
            "latency_ms": duration_ms,
        }
        _set_span_attrs(span, attrs)
        models_refresh_counter.add(1, safe_attributes(attrs))
        models_refresh_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.models.health_refreshed",
            extra={"model_target_id": model_target_id, "subject_id": auth.user_id, **safe_attributes(attrs)},
        )
        return {"ok": True, **outcome}
