from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_agchain_admin
from app.auth.principals import AuthPrincipal
from app.domain.agchain import (
    create_model_target,
    list_model_targets,
    list_supported_providers,
    load_model_detail,
    update_model_target,
)
from app.domain.agchain.provider_registry import create_provider_definition, update_provider_definition
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(prefix="/agchain/models", tags=["agchain-models"])
logger = logging.getLogger("agchain-models")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

providers_list_counter = meter.create_counter("platform.agchain.models.providers.list.count")
providers_create_counter = meter.create_counter("platform.agchain.models.providers.create.count")
providers_update_counter = meter.create_counter("platform.agchain.models.providers.update.count")
models_list_counter = meter.create_counter("platform.agchain.models.list.count")
models_create_counter = meter.create_counter("platform.agchain.models.create.count")
models_update_counter = meter.create_counter("platform.agchain.models.update.count")
models_list_duration_ms = meter.create_histogram("platform.agchain.models.list.duration_ms")


class ProviderDefinitionCreateRequest(BaseModel):
    provider_slug: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    provider_category: str = Field(min_length=1)
    credential_form_kind: str = Field(min_length=1)
    env_var_name: str | None = None
    docs_url: str | None = None
    supported_auth_kinds: list[str] = Field(min_length=1)
    default_probe_strategy: str = "provider_default"
    default_capabilities: dict[str, Any] = Field(default_factory=dict)
    supports_custom_base_url: bool = False
    supports_model_args: bool = True
    enabled: bool = True
    sort_order: int = 100
    notes: str | None = None


class ProviderDefinitionUpdateRequest(BaseModel):
    display_name: str | None = None
    provider_category: str | None = None
    credential_form_kind: str | None = None
    env_var_name: str | None = None
    docs_url: str | None = None
    supported_auth_kinds: list[str] | None = None
    default_probe_strategy: str | None = None
    default_capabilities: dict[str, Any] | None = None
    supports_custom_base_url: bool | None = None
    supports_model_args: bool | None = None
    enabled: bool | None = None
    sort_order: int | None = None
    notes: str | None = None


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


@router.get("/providers", summary="List persisted AGChain provider registry rows")
async def list_supported_providers_route(auth: AuthPrincipal = Depends(require_agchain_admin)):
    with tracer.start_as_current_span("agchain.models.providers.list") as span:
        providers = list_supported_providers()
        attrs = {"row_count": len(providers), "result": "success"}
        set_span_attributes(span, attrs)
        providers_list_counter.add(1, safe_attributes(attrs))
        return {"items": providers}


@router.post("/providers", summary="Create a persisted AGChain provider definition")
async def create_provider_definition_route(
    body: ProviderDefinitionCreateRequest,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.providers.create") as span:
        provider_slug = create_provider_definition(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "provider_slug": provider_slug,
            "provider_category": body.provider_category,
            "credential_form_kind": body.credential_form_kind,
            "provider_enabled": body.enabled,
            "supported_auth_kind_count": len(body.supported_auth_kinds),
            "result": "success",
        }
        set_span_attributes(span, attrs)
        providers_create_counter.add(1, safe_attributes(attrs))
        logger.info("agchain.models.provider.created", extra=safe_attributes(attrs))
        return {"ok": True, "provider_slug": provider_slug}


@router.patch("/providers/{provider_slug}", summary="Update a persisted AGChain provider definition")
async def update_provider_definition_route(
    provider_slug: str,
    body: ProviderDefinitionUpdateRequest,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.providers.update") as span:
        updated_provider_slug = update_provider_definition(
            user_id=auth.user_id,
            provider_slug=provider_slug,
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "provider_slug": updated_provider_slug,
            "provider_enabled": body.enabled,
            "credential_form_kind": body.credential_form_kind,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        providers_update_counter.add(1, safe_attributes(attrs))
        logger.info("agchain.models.provider.updated", extra=safe_attributes(attrs))
        return {"ok": True, "provider_slug": updated_provider_slug}


@router.get("", summary="List AGChain model targets")
async def list_models(
    provider_slug: str | None = Query(default=None),
    compatibility: str | None = Query(default=None),
    health_status: str | None = Query(default=None),
    enabled: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.models.list") as span:
        payload = list_model_targets(
            provider_slug=provider_slug,
            compatibility=compatibility,
            health_status=health_status,
            enabled=enabled,
            search=search,
            limit=limit,
            offset=offset,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "filter.provider_slug_present": provider_slug is not None,
            "filter.compatibility": compatibility,
            "filter.health_status": health_status,
            "row_count": len(payload["items"]),
            "latency_ms": duration_ms,
            "result": "success",
        }
        metric_attrs = {key: value for key, value in safe_attributes(attrs).items() if value is not None}
        set_span_attributes(span, attrs)
        models_list_counter.add(1, metric_attrs)
        models_list_duration_ms.record(duration_ms, metric_attrs)
        return payload


@router.get("/{model_target_id}", summary="Get one AGChain model target")
async def get_model(
    model_target_id: UUID,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.get") as span:
        model_target, recent_health_checks, provider_definition = load_model_detail(
            model_target_id=str(model_target_id),
        )
        if model_target is None:
            raise HTTPException(status_code=404, detail="AGChain model target not found")
        set_span_attributes(
            span,
            {
                "provider_slug": model_target["provider_slug"],
                "auth_kind": model_target["auth_kind"],
                "health_status": model_target["health_status"],
                "result": "success",
            },
        )
        return {
            "model_target": model_target,
            "recent_health_checks": recent_health_checks,
            "provider_definition": provider_definition,
        }


@router.post("", summary="Create an AGChain model target")
async def create_model(
    body: ModelTargetCreateRequest,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.create") as span:
        model_target_id = create_model_target(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "provider_slug": body.provider_slug,
            "auth_kind": body.auth_kind,
            "supports_evaluated": body.supports_evaluated,
            "supports_judge": body.supports_judge,
            "enabled": body.enabled,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        models_create_counter.add(1, safe_attributes(attrs))
        logger.info("agchain.models.created", extra=safe_attributes(attrs))
        return {"ok": True, "model_target_id": model_target_id}


@router.patch("/{model_target_id}", summary="Update an AGChain model target")
async def patch_model(
    model_target_id: UUID,
    body: ModelTargetUpdateRequest,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.update") as span:
        updated_model_target_id = update_model_target(
            user_id=auth.user_id,
            model_target_id=str(model_target_id),
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "enabled": body.enabled,
            "auth_kind": body.auth_kind,
            "probe_strategy": body.probe_strategy,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        models_update_counter.add(1, safe_attributes(attrs))
        logger.info("agchain.models.updated", extra=safe_attributes(attrs))
        return {"ok": True, "model_target_id": updated_model_target_id}
