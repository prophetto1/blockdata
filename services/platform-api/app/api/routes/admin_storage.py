from __future__ import annotations

import logging
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.infra.supabase_client import get_supabase_admin
from app.observability.storage_metrics import (
    record_admin_storage_policy_read,
    record_admin_storage_policy_update,
    record_admin_storage_provisioning_recent,
    storage_tracer,
)

logger = logging.getLogger("platform-api.admin-storage")

DEFAULT_NEW_USER_QUOTA_BYTES = 53_687_091_200
POLICY_KEY = "storage.default_new_user_quota_bytes"

router = APIRouter(prefix="/admin/storage", tags=["admin-storage"])


class UpdateStoragePolicyRequest(BaseModel):
    default_new_user_quota_bytes: int = Field(ge=0)
    reason: str = Field(min_length=1)


def _policy_row_to_response(row: dict[str, Any] | None) -> dict[str, Any]:
    value = DEFAULT_NEW_USER_QUOTA_BYTES
    updated_at = None
    updated_by = None
    if row:
        raw_value = row.get("value_jsonb", DEFAULT_NEW_USER_QUOTA_BYTES)
        value = int(raw_value if raw_value is not None else DEFAULT_NEW_USER_QUOTA_BYTES)
        updated_at = row.get("updated_at")
        updated_by = row.get("updated_by")
    return {
        "default_new_user_quota_bytes": value,
        "updated_at": updated_at,
        "updated_by": updated_by,
    }


def load_default_new_user_quota_bytes(supabase_admin) -> dict[str, Any]:
    result = (
        supabase_admin.table("admin_runtime_policy")
        .select("policy_key, value_jsonb, updated_at, updated_by")
        .eq("policy_key", POLICY_KEY)
        .maybe_single()
        .execute()
    )
    return _policy_row_to_response(result.data)


def update_default_new_user_quota_bytes(
    supabase_admin,
    *,
    actor_id: str,
    quota_bytes: int,
    reason: str,
) -> dict[str, Any]:
    current = (
        supabase_admin.table("admin_runtime_policy")
        .select("policy_key, value_jsonb, updated_at, updated_by")
        .eq("policy_key", POLICY_KEY)
        .maybe_single()
        .execute()
        .data
    )
    old_value = current.get("value_jsonb") if current else DEFAULT_NEW_USER_QUOTA_BYTES

    update_result = (
        supabase_admin.table("admin_runtime_policy")
        .upsert(
            {
                "policy_key": POLICY_KEY,
                "value_jsonb": quota_bytes,
                "value_type": "integer",
                "description": "Default storage quota for newly created users",
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
            "new_value_jsonb": quota_bytes,
            "changed_by": actor_id,
            "reason": reason.strip(),
        }
    ).execute()

    return _policy_row_to_response(row)


def load_recent_signup_provisioning(supabase_admin, *, limit: int) -> dict[str, Any]:
    users = list(supabase_admin.auth.admin.list_users(page=1, per_page=limit) or [])
    users.sort(key=lambda user: getattr(user, "created_at", "") or "", reverse=True)
    user_ids = [str(user.id) for user in users if getattr(user, "id", None)]

    if not user_ids:
        return {"items": []}

    projects = (
        supabase_admin.table("user_projects")
        .select("owner_id, project_id, project_name")
        .in_("owner_id", user_ids)
        .execute()
        .data
        or []
    )
    quotas = (
        supabase_admin.table("storage_quotas")
        .select("user_id, quota_bytes, used_bytes, reserved_bytes")
        .in_("user_id", user_ids)
        .execute()
        .data
        or []
    )

    default_project_by_user = {
        str(row["owner_id"]): row
        for row in projects
        if row.get("project_name") == "Default Project" and row.get("owner_id")
    }
    quota_by_user = {
        str(row["user_id"]): row
        for row in quotas
        if row.get("user_id")
    }

    items = []
    for user in users:
        user_id = str(user.id)
        default_project = default_project_by_user.get(user_id)
        quota = quota_by_user.get(user_id)
        has_default_project = default_project is not None
        has_storage_quota = quota is not None
        items.append(
            {
                "user_id": user_id,
                "email": getattr(user, "email", None),
                "created_at": getattr(user, "created_at", None),
                "has_auth_user": True,
                "has_default_project": has_default_project,
                "default_project_id": default_project.get("project_id") if default_project else None,
                "has_storage_quota": has_storage_quota,
                "quota_bytes": quota.get("quota_bytes") if quota else None,
                "used_bytes": quota.get("used_bytes") if quota else None,
                "reserved_bytes": quota.get("reserved_bytes") if quota else None,
                "status": "ok" if has_default_project and has_storage_quota else "incomplete",
            }
        )

    return {"items": items}


@router.get("/policy", openapi_extra={"x-required-role": "platform_admin"})
async def get_storage_policy(
    auth: AuthPrincipal = Depends(require_superuser),
    supabase_admin=Depends(get_supabase_admin),
):
    _ = auth
    started = perf_counter()
    with storage_tracer.start_as_current_span("admin.storage.policy.read"):
        try:
            result = load_default_new_user_quota_bytes(supabase_admin)
            record_admin_storage_policy_read(
                result="ok",
                quota_bytes=result.get("default_new_user_quota_bytes"),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception:
            record_admin_storage_policy_read(
                result="error",
                quota_bytes=None,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            raise


@router.patch("/policy", openapi_extra={"x-required-role": "platform_admin"})
async def patch_storage_policy(
    payload: UpdateStoragePolicyRequest,
    auth: AuthPrincipal = Depends(require_superuser),
    supabase_admin=Depends(get_supabase_admin),
):
    started = perf_counter()
    with storage_tracer.start_as_current_span("admin.storage.policy.update"):
        try:
            result = update_default_new_user_quota_bytes(
                supabase_admin,
                actor_id=auth.user_id,
                quota_bytes=payload.default_new_user_quota_bytes,
                reason=payload.reason,
            )
            logger.info(
                "admin.storage.policy.updated",
                extra={
                    "actor_role": "platform_admin",
                    "policy_key": POLICY_KEY,
                    "old_value": None,
                    "new_value": payload.default_new_user_quota_bytes,
                    "reason": payload.reason,
                },
            )
            record_admin_storage_policy_update(
                result="ok",
                quota_bytes=payload.default_new_user_quota_bytes,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception as exc:
            record_admin_storage_policy_update(
                result="error",
                quota_bytes=payload.default_new_user_quota_bytes,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            logger.exception("Failed to update storage policy")
            raise HTTPException(status_code=500, detail=f"Failed to update storage policy: {exc}") from exc


@router.get("/provisioning/recent", openapi_extra={"x-required-role": "platform_admin"})
async def get_recent_storage_provisioning(
    limit: int = Query(50, ge=1, le=200),
    auth: AuthPrincipal = Depends(require_superuser),
    supabase_admin=Depends(get_supabase_admin),
):
    _ = auth
    started = perf_counter()
    with storage_tracer.start_as_current_span("admin.storage.provisioning.recent"):
        try:
            result = load_recent_signup_provisioning(supabase_admin, limit=limit)
            incomplete_count = sum(1 for item in result.get("items", []) if item.get("status") != "ok")
            if incomplete_count > 0:
                logger.info(
                    "admin.storage.provisioning.incomplete",
                    extra={"limit": limit, "incomplete_count": incomplete_count},
                )
            record_admin_storage_provisioning_recent(
                result="ok",
                incomplete_count=incomplete_count,
                limit=limit,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception as exc:
            record_admin_storage_provisioning_recent(
                result="error",
                incomplete_count=0,
                limit=limit,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            logger.exception("Failed to load recent storage provisioning")
            raise HTTPException(status_code=500, detail=f"Failed to load recent storage provisioning: {exc}") from exc
