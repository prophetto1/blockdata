from __future__ import annotations

import logging
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_blockdata_admin
from app.auth.principals import AuthPrincipal
from app.infra.supabase_client import get_supabase_admin
from app.observability.admin_config_docling_metrics import (
    admin_config_docling_tracer,
    record_admin_config_docling_read,
    record_admin_config_docling_update,
)

logger = logging.getLogger("platform-api.admin-config-docling")

POLICY_KEY = "platform.docling_blocks_mode"
DEFAULT_DOCLING_BLOCKS_MODE = "raw_docling"
VALID_MODES = {"raw_docling"}

router = APIRouter(prefix="/admin/config/docling", tags=["admin-config-docling"])


class UpdateDoclingConfigRequest(BaseModel):
    docling_blocks_mode: str = Field(pattern=r"^(raw_docling)$")
    reason: str = Field(min_length=1)


def _read_docling_blocks_mode(supabase_admin: Any) -> dict[str, Any]:
    result = (
        supabase_admin.table("admin_runtime_policy")
        .select("policy_key, value_jsonb, updated_at, updated_by")
        .eq("policy_key", POLICY_KEY)
        .maybe_single()
        .execute()
    )
    row = result.data
    if row:
        value = row.get("value_jsonb", DEFAULT_DOCLING_BLOCKS_MODE)
        if value not in VALID_MODES:
            value = DEFAULT_DOCLING_BLOCKS_MODE
        return {
            "docling_blocks_mode": value,
            "updated_at": row.get("updated_at"),
            "updated_by": row.get("updated_by"),
        }
    return {"docling_blocks_mode": DEFAULT_DOCLING_BLOCKS_MODE}


def _update_docling_blocks_mode(
    supabase_admin: Any,
    *,
    actor_id: str,
    mode: str,
    reason: str,
) -> dict[str, Any]:
    current = (
        supabase_admin.table("admin_runtime_policy")
        .select("policy_key, value_jsonb")
        .eq("policy_key", POLICY_KEY)
        .maybe_single()
        .execute()
        .data
    )
    old_value = current.get("value_jsonb") if current else DEFAULT_DOCLING_BLOCKS_MODE

    update_result = (
        supabase_admin.table("admin_runtime_policy")
        .upsert(
            {
                "policy_key": POLICY_KEY,
                "value_jsonb": mode,
                "value_type": "string",
                "description": "Docling block presentation mode",
                "updated_by": actor_id,
            }
        )
        .execute()
    )

    row = (update_result.data or [None])[0]

    supabase_admin.table("admin_runtime_policy_audit").insert(
        {
            "policy_key": POLICY_KEY,
            "old_value_jsonb": old_value,
            "new_value_jsonb": mode,
            "changed_by": actor_id,
            "reason": reason.strip(),
        }
    ).execute()

    return {
        "docling_blocks_mode": mode,
        "updated_at": row.get("updated_at") if row else None,
        "updated_by": row.get("updated_by") if row else actor_id,
    }


@router.get("", openapi_extra={"x-required-role": "blockdata_admin"})
async def get_docling_config(
    auth: AuthPrincipal = Depends(require_blockdata_admin),
    supabase_admin=Depends(get_supabase_admin),
):
    _ = auth
    started = perf_counter()
    with admin_config_docling_tracer.start_as_current_span("admin.config.docling.read"):
        try:
            result = _read_docling_blocks_mode(supabase_admin)
            record_admin_config_docling_read(
                result="ok",
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception:
            record_admin_config_docling_read(
                result="error",
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            raise


@router.patch("", openapi_extra={"x-required-role": "blockdata_admin"})
async def patch_docling_config(
    payload: UpdateDoclingConfigRequest,
    auth: AuthPrincipal = Depends(require_blockdata_admin),
    supabase_admin=Depends(get_supabase_admin),
):
    started = perf_counter()
    with admin_config_docling_tracer.start_as_current_span("admin.config.docling.update"):
        try:
            result = _update_docling_blocks_mode(
                supabase_admin,
                actor_id=auth.user_id,
                mode=payload.docling_blocks_mode,
                reason=payload.reason,
            )
            logger.info(
                "admin.config.docling.updated",
                extra={
                    "actor_role": "blockdata_admin",
                    "policy_key": POLICY_KEY,
                    "old_value": None,
                    "new_value": payload.docling_blocks_mode,
                    "reason": payload.reason,
                },
            )
            record_admin_config_docling_update(
                result="ok",
                docling_blocks_mode=payload.docling_blocks_mode,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception as exc:
            record_admin_config_docling_update(
                result="error",
                docling_blocks_mode=payload.docling_blocks_mode,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            logger.exception("Failed to update docling config")
            raise HTTPException(status_code=500, detail="Failed to update docling config") from exc
