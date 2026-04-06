from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.provider_credentials import (
    delete_organization_model_provider_credential,
    list_organization_model_providers,
    test_organization_model_provider_credential,
    upsert_organization_model_provider_credential,
)
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(
    prefix="/agchain/organizations/{organization_id}/model-providers",
    tags=["agchain-organization-model-providers"],
)
logger = logging.getLogger("agchain-organization-model-providers")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

list_counter = meter.create_counter("platform.agchain.organization_model_providers.list.count")
save_counter = meter.create_counter("platform.agchain.organization_model_providers.credential.save.count")
test_counter = meter.create_counter("platform.agchain.organization_model_providers.credential.test.count")
delete_counter = meter.create_counter("platform.agchain.organization_model_providers.credential.delete.count")
list_duration_ms = meter.create_histogram("platform.agchain.organization_model_providers.list.duration_ms")
save_duration_ms = meter.create_histogram("platform.agchain.organization_model_providers.credential.save.duration_ms")
test_duration_ms = meter.create_histogram("platform.agchain.organization_model_providers.credential.test.duration_ms")
delete_duration_ms = meter.create_histogram("platform.agchain.organization_model_providers.credential.delete.duration_ms")


class CredentialPayloadRequest(BaseModel):
    credential_payload: dict[str, Any] = Field(default_factory=dict)


@router.get("", summary="List organization-scoped AGChain model providers")
async def list_organization_model_providers_route(
    organization_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.organization_model_providers.list") as span:
        result = list_organization_model_providers(user_id=auth.user_id, organization_id=organization_id)
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "row_count": len(result["items"]),
            "result": "success",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        list_counter.add(1, safe_attributes(attrs))
        list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.put("/{provider_slug}/credential", summary="Save organization-scoped AGChain provider credential")
async def put_organization_model_provider_credential_route(
    organization_id: str,
    provider_slug: str,
    body: CredentialPayloadRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.organization_model_providers.credential.upsert") as span:
        result = upsert_organization_model_provider_credential(
            user_id=auth.user_id,
            organization_id=organization_id,
            provider_slug=provider_slug,
            credential_payload=body.credential_payload,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "provider_slug": provider_slug,
            "credential_status": result["credential_status"],
            "result": "success",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        save_counter.add(1, safe_attributes(attrs))
        save_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.organization_model_provider.credential_saved",
            extra=safe_attributes(attrs),
        )
        return {"ok": True, **result}


@router.post("/{provider_slug}/credential/test", summary="Validate organization-scoped AGChain provider credential")
async def test_organization_model_provider_credential_route(
    organization_id: str,
    provider_slug: str,
    body: CredentialPayloadRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.organization_model_providers.credential.test") as span:
        result = await test_organization_model_provider_credential(
            user_id=auth.user_id,
            organization_id=organization_id,
            provider_slug=provider_slug,
            credential_payload=body.credential_payload,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "provider_slug": provider_slug,
            "result": result["result"],
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        test_counter.add(1, safe_attributes(attrs))
        test_duration_ms.record(duration_ms, safe_attributes(attrs))
        return {"ok": True, **result}


@router.delete("/{provider_slug}/credential", summary="Delete organization-scoped AGChain provider credential")
async def delete_organization_model_provider_credential_route(
    organization_id: str,
    provider_slug: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.organization_model_providers.credential.delete") as span:
        result = delete_organization_model_provider_credential(
            user_id=auth.user_id,
            organization_id=organization_id,
            provider_slug=provider_slug,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "provider_slug": provider_slug,
            "credential_status": result["credential_status"],
            "result": "success",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        delete_counter.add(1, safe_attributes(attrs))
        delete_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.organization_model_provider.credential_deleted",
            extra=safe_attributes(attrs),
        )
        return {"ok": True, **result}
