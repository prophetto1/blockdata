from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_blockdata_admin
from app.auth.principals import AuthPrincipal
from app.domain.blockdata import (
    create_provider_definition,
    create_provider_model,
    list_provider_definitions,
    list_provider_models,
    update_provider_definition,
    update_provider_model,
)
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(prefix="/admin/ai-providers", tags=["admin-ai-providers"])
logger = logging.getLogger("admin-ai-providers")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

providers_list_counter = meter.create_counter("platform.admin.ai_providers.list.count")
providers_create_counter = meter.create_counter("platform.admin.ai_providers.create.count")
providers_update_counter = meter.create_counter("platform.admin.ai_providers.update.count")
provider_models_list_counter = meter.create_counter("platform.admin.ai_provider_models.list.count")
provider_models_create_counter = meter.create_counter("platform.admin.ai_provider_models.create.count")
provider_models_update_counter = meter.create_counter("platform.admin.ai_provider_models.update.count")
providers_list_duration_ms = meter.create_histogram("platform.admin.ai_providers.list.duration_ms")
provider_models_list_duration_ms = meter.create_histogram(
    "platform.admin.ai_provider_models.list.duration_ms"
)


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


class ProviderModelCreateRequest(BaseModel):
    label: str = Field(min_length=1)
    provider_slug: str = Field(min_length=1)
    model_id: str = Field(min_length=1)
    qualified_model: str = Field(min_length=1)
    api_base: str | None = None
    auth_kind: str = Field(min_length=1)
    config_jsonb: dict[str, Any] = Field(default_factory=dict)
    capabilities_jsonb: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    sort_order: int = 100
    notes: str | None = None


class ProviderModelUpdateRequest(BaseModel):
    label: str | None = None
    provider_slug: str | None = None
    model_id: str | None = None
    qualified_model: str | None = None
    api_base: str | None = None
    auth_kind: str | None = None
    config_jsonb: dict[str, Any] | None = None
    capabilities_jsonb: dict[str, Any] | None = None
    enabled: bool | None = None
    sort_order: int | None = None
    notes: str | None = None


@router.get("", summary="List Blockdata admin provider registry rows")
async def list_provider_definitions_route(auth: AuthPrincipal = Depends(require_blockdata_admin)):
    start = time.perf_counter()
    with tracer.start_as_current_span("admin.ai_providers.list") as span:
        providers = list_provider_definitions()
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "actor_role": "blockdata_admin",
            "http.status_code": 200,
            "row_count": len(providers),
            "result": "success",
        }
        metric_attrs = safe_attributes(attrs)
        set_span_attributes(span, attrs)
        providers_list_counter.add(1, metric_attrs)
        providers_list_duration_ms.record(duration_ms, metric_attrs)
        return {"items": providers}


@router.post("", summary="Create a Blockdata admin provider definition")
async def create_provider_definition_route(
    body: ProviderDefinitionCreateRequest,
    auth: AuthPrincipal = Depends(require_blockdata_admin),
):
    with tracer.start_as_current_span("admin.ai_providers.create") as span:
        provider_slug = create_provider_definition(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "actor_role": "blockdata_admin",
            "http.status_code": 200,
            "provider_slug": provider_slug,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        providers_create_counter.add(1, safe_attributes(attrs))
        logger.info("admin.ai_providers.created", extra=safe_attributes(attrs))
        return {"ok": True, "provider_slug": provider_slug}


@router.patch("/{provider_slug}", summary="Update a Blockdata admin provider definition")
async def update_provider_definition_route(
    provider_slug: str,
    body: ProviderDefinitionUpdateRequest,
    auth: AuthPrincipal = Depends(require_blockdata_admin),
):
    with tracer.start_as_current_span("admin.ai_providers.update") as span:
        updated_provider_slug = update_provider_definition(
            user_id=auth.user_id,
            provider_slug=provider_slug,
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "actor_role": "blockdata_admin",
            "http.status_code": 200,
            "provider_slug": updated_provider_slug,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        providers_update_counter.add(1, safe_attributes(attrs))
        logger.info("admin.ai_providers.updated", extra=safe_attributes(attrs))
        return {"ok": True, "provider_slug": updated_provider_slug}


@router.get("/models", summary="List Blockdata admin provider-model rows")
async def list_provider_models_route(
    provider_slug: str | None = Query(default=None),
    enabled: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_blockdata_admin),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("admin.ai_provider_models.list") as span:
        payload = list_provider_models(
            provider_slug=provider_slug,
            enabled=enabled,
            search=search,
            limit=limit,
            offset=offset,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "actor_role": "blockdata_admin",
            "http.status_code": 200,
            "provider_slug": provider_slug or "__all__",
            "filter.provider_slug_present": provider_slug is not None,
            "row_count": len(payload["items"]),
            "result": "success",
        }
        metric_attrs = safe_attributes(attrs)
        set_span_attributes(span, attrs)
        provider_models_list_counter.add(1, metric_attrs)
        provider_models_list_duration_ms.record(duration_ms, metric_attrs)
        return payload


@router.post("/models", summary="Create a Blockdata admin provider-model row")
async def create_provider_model_route(
    body: ProviderModelCreateRequest,
    auth: AuthPrincipal = Depends(require_blockdata_admin),
):
    with tracer.start_as_current_span("admin.ai_provider_models.create") as span:
        provider_model_id = create_provider_model(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "actor_role": "blockdata_admin",
            "http.status_code": 200,
            "provider_slug": body.provider_slug,
            "provider_model_id": provider_model_id,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        provider_models_create_counter.add(1, safe_attributes(attrs))
        logger.info("admin.ai_provider_models.created", extra=safe_attributes(attrs))
        return {"ok": True, "provider_model_id": provider_model_id}


@router.patch("/models/{provider_model_id}", summary="Update a Blockdata admin provider-model row")
async def update_provider_model_route(
    provider_model_id: UUID,
    body: ProviderModelUpdateRequest,
    auth: AuthPrincipal = Depends(require_blockdata_admin),
):
    with tracer.start_as_current_span("admin.ai_provider_models.update") as span:
        updated_provider_model_id = update_provider_model(
            user_id=auth.user_id,
            provider_model_id=str(provider_model_id),
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "actor_role": "blockdata_admin",
            "http.status_code": 200,
            "provider_slug": body.provider_slug or "__unchanged__",
            "provider_model_id": updated_provider_model_id,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        provider_models_update_counter.add(1, safe_attributes(attrs))
        logger.info("admin.ai_provider_models.updated", extra=safe_attributes(attrs))
        return {"ok": True, "provider_model_id": updated_provider_model_id}
