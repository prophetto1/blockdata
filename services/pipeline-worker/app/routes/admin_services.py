"""Admin services CRUD — port of supabase/functions/admin-services to FastAPI."""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..shared.supabase_client import get_supabase_admin
from ..shared.superuser import SuperuserContext, require_superuser

logger = logging.getLogger("admin-services")

router = APIRouter(prefix="/admin/services", tags=["admin-services"])

# ---------------------------------------------------------------------------
#  Validators
# ---------------------------------------------------------------------------

HEALTH_STATUSES = {"online", "offline", "degraded", "unknown"}
HTTP_METHODS = {"GET", "POST", "PUT", "DELETE"}
FUNCTION_TYPES = {
    "source", "destination", "transform", "parse", "convert",
    "export", "test", "utility", "macro", "custom", "ingest", "callback", "flow",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
#  GET /admin/services — list everything
# ---------------------------------------------------------------------------

@router.get("")
async def list_services(su: SuperuserContext = Depends(require_superuser)):
    sb = get_supabase_admin()

    services_q = sb.table("registry_services").select("*").execute()
    functions_q = sb.table("registry_service_functions").select("*").execute()
    types_q = sb.table("registry_service_types").select(
        "service_type,label,description"
    ).execute()

    services = sorted(services_q.data or [], key=lambda r: (r.get("service_type", ""), r.get("service_name", "")))
    functions = sorted(functions_q.data or [], key=lambda r: (r.get("service_id", ""), r.get("function_name", "")))
    stypes = sorted(types_q.data or [], key=lambda r: r.get("service_type", ""))

    return {
        "superuser": {"user_id": su.user_id, "email": su.email},
        "service_types": stypes,
        "services": services,
        "functions": functions,
    }


# ---------------------------------------------------------------------------
#  POST /admin/services/service — create service
# ---------------------------------------------------------------------------

class CreateServiceBody(BaseModel):
    service_type: str
    service_name: str
    base_url: str
    health_status: str = "unknown"
    enabled: bool = True
    config: dict[str, Any] = Field(default_factory=dict)
    description: str | None = None
    auth_type: str = "none"
    auth_config: dict[str, Any] = Field(default_factory=dict)
    docs_url: str | None = None


@router.post("/service")
async def create_service(
    body: CreateServiceBody,
    su: SuperuserContext = Depends(require_superuser),
):
    if body.health_status not in HEALTH_STATUSES:
        raise HTTPException(400, f"health_status must be one of: {', '.join(sorted(HEALTH_STATUSES))}")

    sb = get_supabase_admin()
    result = sb.table("registry_services").insert({
        "service_type": body.service_type.strip(),
        "service_name": body.service_name.strip(),
        "base_url": body.base_url.strip(),
        "health_status": body.health_status,
        "enabled": body.enabled,
        "config": body.config,
        "description": body.description,
        "auth_type": body.auth_type,
        "auth_config": body.auth_config,
        "docs_url": body.docs_url,
    }).execute()

    row = (result.data or [{}])[0]
    return {"ok": True, "created_target": "service", "created_id": row.get("service_id")}


# ---------------------------------------------------------------------------
#  PATCH /admin/services/service/{service_id} — update service
# ---------------------------------------------------------------------------

class UpdateServiceBody(BaseModel):
    service_type: str | None = None
    service_name: str | None = None
    base_url: str | None = None
    health_status: str | None = None
    enabled: bool | None = None
    config: dict[str, Any] | None = None
    description: str | None = None
    auth_type: str | None = None
    auth_config: dict[str, Any] | None = None
    docs_url: str | None = None


@router.patch("/service/{service_id}")
async def update_service(
    service_id: str,
    body: UpdateServiceBody,
    su: SuperuserContext = Depends(require_superuser),
):
    update: dict[str, Any] = {}
    if body.service_type is not None:
        update["service_type"] = body.service_type.strip()
    if body.service_name is not None:
        update["service_name"] = body.service_name.strip()
    if body.base_url is not None:
        update["base_url"] = body.base_url.strip()
    if body.health_status is not None:
        if body.health_status not in HEALTH_STATUSES:
            raise HTTPException(400, f"health_status must be one of: {', '.join(sorted(HEALTH_STATUSES))}")
        update["health_status"] = body.health_status
    if body.enabled is not None:
        update["enabled"] = body.enabled
    if body.config is not None:
        update["config"] = body.config
    if body.description is not None:
        update["description"] = body.description
    if body.auth_type is not None:
        update["auth_type"] = body.auth_type.strip()
    if body.auth_config is not None:
        update["auth_config"] = body.auth_config
    if body.docs_url is not None:
        update["docs_url"] = body.docs_url.strip()

    if not update:
        raise HTTPException(400, "No updatable fields provided")

    update["updated_at"] = _now_iso()

    sb = get_supabase_admin()
    sb.table("registry_services").update(update).eq("service_id", service_id).execute()
    return {"ok": True, "updated_target": "service", "updated_id": service_id}


# ---------------------------------------------------------------------------
#  DELETE /admin/services/service/{service_id}
# ---------------------------------------------------------------------------

@router.delete("/service/{service_id}")
async def delete_service(
    service_id: str,
    su: SuperuserContext = Depends(require_superuser),
):
    sb = get_supabase_admin()
    sb.table("registry_services").delete().eq("service_id", service_id).execute()
    return {"ok": True, "deleted_target": "service", "deleted_id": service_id}


# ---------------------------------------------------------------------------
#  POST /admin/services/function — create function
# ---------------------------------------------------------------------------

class CreateFunctionBody(BaseModel):
    service_id: str
    function_name: str
    function_type: str
    label: str
    description: str | None = None
    long_description: str | None = None
    entrypoint: str
    http_method: str = "POST"
    content_type: str = "application/json"
    parameter_schema: list[dict[str, Any]] = Field(default_factory=list)
    result_schema: dict[str, Any] | None = None
    request_example: dict[str, Any] | None = None
    response_example: dict[str, Any] | None = None
    examples: list[Any] = Field(default_factory=list)
    metrics: list[Any] = Field(default_factory=list)
    enabled: bool = True
    deprecated: bool = False
    beta: bool = False
    tags: list[str] = Field(default_factory=list)
    auth_type: str | None = None
    auth_config: dict[str, Any] | None = None
    when_to_use: str | None = None
    provider_docs_url: str | None = None
    source_task_class: str | None = None
    plugin_group: str | None = None


@router.post("/function")
async def create_function(
    body: CreateFunctionBody,
    su: SuperuserContext = Depends(require_superuser),
):
    if body.function_type not in FUNCTION_TYPES:
        raise HTTPException(400, f"function_type must be one of: {', '.join(sorted(FUNCTION_TYPES))}")
    if body.http_method.upper() not in HTTP_METHODS:
        raise HTTPException(400, f"http_method must be one of: {', '.join(sorted(HTTP_METHODS))}")

    sb = get_supabase_admin()
    result = sb.table("registry_service_functions").insert({
        "service_id": body.service_id.strip(),
        "function_name": body.function_name.strip(),
        "function_type": body.function_type,
        "label": body.label.strip(),
        "description": body.description,
        "long_description": body.long_description,
        "entrypoint": body.entrypoint.strip(),
        "http_method": body.http_method.upper(),
        "content_type": body.content_type,
        "parameter_schema": body.parameter_schema,
        "result_schema": body.result_schema,
        "request_example": body.request_example,
        "response_example": body.response_example,
        "examples": body.examples,
        "metrics": body.metrics,
        "enabled": body.enabled,
        "deprecated": body.deprecated,
        "beta": body.beta,
        "tags": body.tags,
        "auth_type": body.auth_type,
        "auth_config": body.auth_config,
        "when_to_use": body.when_to_use,
        "provider_docs_url": body.provider_docs_url,
        "source_task_class": body.source_task_class,
        "plugin_group": body.plugin_group,
    }).execute()

    row = (result.data or [{}])[0]
    return {"ok": True, "created_target": "function", "created_id": row.get("function_id")}


# ---------------------------------------------------------------------------
#  PATCH /admin/services/function/{function_id} — update function
# ---------------------------------------------------------------------------

class UpdateFunctionBody(BaseModel):
    function_name: str | None = None
    function_type: str | None = None
    label: str | None = None
    description: str | None = None
    long_description: str | None = None
    entrypoint: str | None = None
    http_method: str | None = None
    content_type: str | None = None
    parameter_schema: list[dict[str, Any]] | None = None
    result_schema: dict[str, Any] | None = None
    request_example: dict[str, Any] | None = None
    response_example: dict[str, Any] | None = None
    examples: list[Any] | None = None
    metrics: list[Any] | None = None
    enabled: bool | None = None
    deprecated: bool | None = None
    beta: bool | None = None
    tags: list[str] | None = None
    auth_type: str | None = None
    auth_config: dict[str, Any] | None = None
    when_to_use: str | None = None
    provider_docs_url: str | None = None
    source_task_class: str | None = None
    plugin_group: str | None = None


@router.patch("/function/{function_id}")
async def update_function(
    function_id: str,
    body: UpdateFunctionBody,
    su: SuperuserContext = Depends(require_superuser),
):
    # Validate constrained fields
    if body.function_type is not None and body.function_type not in FUNCTION_TYPES:
        raise HTTPException(400, f"function_type must be one of: {', '.join(sorted(FUNCTION_TYPES))}")
    if body.http_method is not None and body.http_method.upper() not in HTTP_METHODS:
        raise HTTPException(400, f"http_method must be one of: {', '.join(sorted(HTTP_METHODS))}")

    # Fields that need .strip()
    STRIP_FIELDS = {"function_name", "label", "entrypoint", "source_task_class", "plugin_group",
                    "when_to_use", "provider_docs_url", "content_type", "auth_type"}
    # Fields passed through as-is
    PASS_FIELDS = {"description", "long_description", "parameter_schema", "result_schema",
                   "request_example", "response_example", "examples", "metrics",
                   "enabled", "deprecated", "beta", "tags", "auth_config"}

    update: dict[str, Any] = {}
    for field in STRIP_FIELDS:
        val = getattr(body, field, None)
        if val is not None:
            update[field] = val.strip() if isinstance(val, str) else val
    for field in PASS_FIELDS:
        val = getattr(body, field, None)
        if val is not None:
            update[field] = val
    if body.function_type is not None:
        update["function_type"] = body.function_type
    if body.http_method is not None:
        update["http_method"] = body.http_method.upper()

    if not update:
        raise HTTPException(400, "No updatable fields provided")

    update["updated_at"] = _now_iso()

    sb = get_supabase_admin()
    sb.table("registry_service_functions").update(update).eq("function_id", function_id).execute()
    return {"ok": True, "updated_target": "function", "updated_id": function_id}


# ---------------------------------------------------------------------------
#  DELETE /admin/services/function/{function_id}
# ---------------------------------------------------------------------------

@router.delete("/function/{function_id}")
async def delete_function(
    function_id: str,
    su: SuperuserContext = Depends(require_superuser),
):
    sb = get_supabase_admin()
    sb.table("registry_service_functions").delete().eq("function_id", function_id).execute()
    return {"ok": True, "deleted_target": "function", "deleted_id": function_id}


# ---------------------------------------------------------------------------
#  POST /admin/services/import — bulk import (registry JSON)
# ---------------------------------------------------------------------------

class ImportRegistryBody(BaseModel):
    import_mode: str = "upsert"
    default_base_url: str = "http://localhost:8000"
    services: list[dict[str, Any]] = Field(default_factory=list)
    functions: list[dict[str, Any]] = Field(default_factory=list)
    plugins: list[Any] = Field(default_factory=list)


def _to_snake_case(value: str) -> str:
    import re
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value)
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s)
    return s.strip("_").lower()


def _infer_service_type(plugin_type: str) -> str:
    v = plugin_type.lower()
    if ".dbt." in v:
        return "dbt"
    if ".docling." in v or "document" in v or "parser" in v:
        return "docling"
    if ".jdbc." in v or ".sql." in v or ".dlt." in v or "sqlite" in v:
        return "dlt"
    if "convert" in v:
        return "conversion"
    return "custom"


def _infer_function_type(plugin_type: str) -> str:
    v = plugin_type.lower()
    if ".dbt." in v:
        return "transform"
    if ".jdbc." in v or ".sql." in v or "trigger" in v:
        return "source"
    if ".docling." in v or "parse" in v:
        return "parse"
    if "convert" in v:
        return "convert"
    return "utility"


@router.post("/import")
async def import_registry(
    body: ImportRegistryBody,
    su: SuperuserContext = Depends(require_superuser),
):
    sb = get_supabase_admin()

    # Load known service types
    types_resp = sb.table("registry_service_types").select("service_type").execute()
    known_types = {r["service_type"] for r in (types_resp.data or [])}
    has_custom = "custom" in known_types

    def normalize_type(t: str) -> str:
        if t in known_types:
            return t
        return "custom" if has_custom else t

    errors: list[str] = []
    service_rows: dict[str, dict[str, Any]] = {}  # key -> row
    fn_rows: list[dict[str, Any]] = []

    # Process explicit services
    for item in body.services:
        st = normalize_type(item.get("service_type", "").strip())
        sn = item.get("service_name", "").strip()
        if not st or not sn:
            errors.append("services[] requires service_type and service_name.")
            continue
        key = f"{st}::{sn}"
        service_rows[key] = {
            "service_type": st,
            "service_name": sn,
            "base_url": item.get("base_url", body.default_base_url).strip() or body.default_base_url,
            "health_status": item.get("health_status", "unknown"),
            "enabled": item.get("enabled", True),
            "config": item.get("config", {}),
        }

    # Process plugins (Kestra-style type strings)
    for item in body.plugins:
        if isinstance(item, str):
            plugin_type = item.strip()
            meta: dict[str, Any] = {}
        elif isinstance(item, dict):
            meta = item
            plugin_type = item.get("type", "").strip()
        else:
            errors.append("plugins[] item requires type.")
            continue
        if not plugin_type:
            errors.append("plugins[] item requires type.")
            continue

        st = normalize_type(meta.get("service_type", "").strip() or _infer_service_type(plugin_type))
        sn = meta.get("service_name", "").strip() or f"kestra-{st}"
        key = f"{st}::{sn}"
        existing = service_rows.get(key)
        service_rows[key] = {
            "service_type": st,
            "service_name": sn,
            "base_url": existing.get("base_url") if existing else meta.get("base_url", body.default_base_url),
            "health_status": existing.get("health_status", "unknown") if existing else "unknown",
            "enabled": existing.get("enabled", True) if existing else meta.get("enabled", True),
            "config": {**(existing.get("config", {}) if existing else {}), **meta.get("config", {})},
        }

        segments = plugin_type.split(".")
        label = meta.get("label", "").strip() or segments[-1]
        fn_name = meta.get("function_name", "").strip() or _to_snake_case(label) or _to_snake_case(plugin_type)
        ft_raw = meta.get("function_type", "").strip() or _infer_function_type(plugin_type)
        ft = ft_raw if ft_raw in FUNCTION_TYPES else "utility"

        fn_rows.append({
            "_service_key": key,
            "function_name": fn_name,
            "function_type": ft,
            "label": label,
            "description": meta.get("description"),
            "entrypoint": meta.get("entrypoint", plugin_type).strip(),
            "http_method": (meta.get("http_method", "POST") or "POST").upper(),
            "enabled": meta.get("enabled", True),
            "tags": meta.get("tags", ["kestra", st]),
        })

    # Process explicit functions
    for item in body.functions:
        fn_name = item.get("function_name", "").strip()
        label = item.get("label", "").strip()
        entrypoint = item.get("entrypoint", "").strip()
        ft = item.get("function_type", "").strip()
        if not fn_name or not label or not entrypoint or not ft:
            errors.append("functions[] requires function_name, function_type, label, and entrypoint.")
            continue
        sid = item.get("service_id", "").strip()
        st = normalize_type(item.get("service_type", "").strip())
        sn = item.get("service_name", "").strip()
        if not sid and not (st and sn):
            errors.append(f"functions[] {fn_name}: provide service_id or (service_type + service_name).")
            continue

        fn_rows.append({
            "_service_id": sid or None,
            "_service_key": f"{st}::{sn}" if st and sn else None,
            "function_name": fn_name,
            "function_type": ft if ft in FUNCTION_TYPES else "utility",
            "label": label,
            "description": item.get("description"),
            "entrypoint": entrypoint,
            "http_method": (item.get("http_method", "POST") or "POST").upper(),
            "enabled": item.get("enabled", True),
            "tags": item.get("tags", []),
        })

    # Upsert services
    svc_id_by_key: dict[str, str] = {}
    rows_list = list(service_rows.values())
    if rows_list:
        if body.import_mode == "upsert":
            resp = sb.table("registry_services").upsert(
                rows_list, on_conflict="service_type,service_name"
            ).execute()
        else:
            resp = sb.table("registry_services").insert(rows_list).execute()
        for r in (resp.data or []):
            k = f"{r['service_type']}::{r['service_name']}"
            svc_id_by_key[k] = r["service_id"]

    # Resolve service IDs and upsert functions
    resolved_fns: list[dict[str, Any]] = []
    for fn in fn_rows:
        sid = fn.pop("_service_id", None)
        key = fn.pop("_service_key", None)
        if not sid and key:
            sid = svc_id_by_key.get(key)
        if not sid:
            errors.append(f"Unable to resolve service for function {fn['function_name']}.")
            continue
        fn["service_id"] = sid
        resolved_fns.append(fn)

    if resolved_fns:
        if body.import_mode == "upsert":
            sb.table("registry_service_functions").upsert(
                resolved_fns, on_conflict="service_id,function_name"
            ).execute()
        else:
            sb.table("registry_service_functions").insert(resolved_fns).execute()

    return {
        "ok": True,
        "imported": {"services": len(rows_list), "functions": len(resolved_fns)},
        "warnings": errors,
        "mode": body.import_mode,
    }
