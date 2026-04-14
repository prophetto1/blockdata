from __future__ import annotations

import logging
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.core.config import get_settings
from app.observability.contract import set_span_attributes
from app.observability.admin_cloud_costs_metrics import (
    record_admin_cloud_cost_items_read,
    record_admin_cloud_cost_summary_read,
    tracer,
)
from app.services.cloud_costs.gcp_billing import (
    GcpBillingConfigurationError,
    GcpBillingQueryError,
    load_gcp_billing_summary,
    load_gcp_cost_inventory_items,
    normalize_invoice_month,
)

logger = logging.getLogger("platform-api.admin-cloud-costs")
router = APIRouter(prefix="/admin/cloud-costs", tags=["admin-cloud-costs"])


def _is_present(value: str | None) -> bool:
    return bool(value and value.strip())


@router.get("/gcp/summary", openapi_extra={"x-required-role": "platform_admin"})
async def get_gcp_billing_summary(
    invoice_month: str | None = Query(None),
    billing_account_id: str | None = Query(None),
    auth: AuthPrincipal = Depends(require_superuser),
):
    _ = auth
    settings = get_settings()
    started = perf_counter()
    invoice_month_present = _is_present(invoice_month)
    billing_account_filter_present = _is_present(billing_account_id)
    with tracer.start_as_current_span("admin.cloud_costs.gcp.summary.read") as span:
        try:
            normalized_invoice_month = normalize_invoice_month(invoice_month)
            result = load_gcp_billing_summary(
                settings,
                invoice_month=normalized_invoice_month,
                billing_account_id=billing_account_id,
            )
            _record_summary_observability(
                span=span,
                result="ok",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=False,
                service_filter_present=False,
                project_filter_present=False,
                search_present=False,
            )
            return result
        except GcpBillingConfigurationError as exc:
            payload = _build_unconfigured_summary_payload(
                settings=settings,
                invoice_month=invoice_month,
                error=str(exc),
            )
            _record_summary_observability(
                span=span,
                result="config_missing",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=False,
                service_filter_present=False,
                project_filter_present=False,
                search_present=False,
            )
            return payload
        except ValueError as exc:
            _record_summary_observability(
                span=span,
                result="error",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=400,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=False,
                service_filter_present=False,
                project_filter_present=False,
                search_present=False,
            )
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except GcpBillingQueryError as exc:
            _record_summary_observability(
                span=span,
                result="error",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=503,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=False,
                service_filter_present=False,
                project_filter_present=False,
                search_present=False,
            )
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            _record_summary_observability(
                span=span,
                result="error",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=False,
                service_filter_present=False,
                project_filter_present=False,
                search_present=False,
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to read GCP billing summary",
            ) from exc


@router.get("/gcp/items", openapi_extra={"x-required-role": "platform_admin"})
async def get_gcp_cost_inventory_items(
    invoice_month: str | None = Query(None),
    billing_account_id: str | None = Query(None),
    service_category: str | None = Query(None),
    service: str | None = Query(None),
    project_id: str | None = Query(None),
    search: str | None = Query(None),
    auth: AuthPrincipal = Depends(require_superuser),
):
    _ = auth
    settings = get_settings()
    started = perf_counter()
    invoice_month_present = _is_present(invoice_month)
    billing_account_filter_present = _is_present(billing_account_id)
    service_category_filter_present = _is_present(service_category)
    service_filter_present = _is_present(service)
    project_filter_present = _is_present(project_id)
    search_present = _is_present(search)
    with tracer.start_as_current_span("admin.cloud_costs.gcp.items.read") as span:
        try:
            normalized_invoice_month = normalize_invoice_month(invoice_month)
            result = load_gcp_cost_inventory_items(
                settings,
                invoice_month=normalized_invoice_month,
                billing_account_id=billing_account_id,
                service_category=service_category,
                service=service,
                project_id=project_id,
                search=search,
            )
            _record_items_observability(
                span=span,
                result="ok",
                truncated=result.get("truncated", False),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=service_category_filter_present,
                service_filter_present=service_filter_present,
                project_filter_present=project_filter_present,
                search_present=search_present,
            )
            return result
        except GcpBillingConfigurationError as exc:
            _record_items_observability(
                span=span,
                result="config_missing",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=503,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=service_category_filter_present,
                service_filter_present=service_filter_present,
                project_filter_present=project_filter_present,
                search_present=search_present,
            )
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            _record_items_observability(
                span=span,
                result="error",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=400,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=service_category_filter_present,
                service_filter_present=service_filter_present,
                project_filter_present=project_filter_present,
                search_present=search_present,
            )
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except GcpBillingQueryError as exc:
            _record_items_observability(
                span=span,
                result="error",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=503,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=service_category_filter_present,
                service_filter_present=service_filter_present,
                project_filter_present=project_filter_present,
                search_present=search_present,
            )
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            _record_items_observability(
                span=span,
                result="error",
                truncated=False,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
                invoice_month_present=invoice_month_present,
                billing_account_filter_present=billing_account_filter_present,
                service_category_filter_present=service_category_filter_present,
                service_filter_present=service_filter_present,
                project_filter_present=project_filter_present,
                search_present=search_present,
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to read GCP cost inventory items",
            ) from exc


def _record_summary_observability(
    *,
    span: Any,
    result: str,
    truncated: bool,
    duration_ms: float,
    http_status_code: int,
    invoice_month_present: bool,
    billing_account_filter_present: bool,
    service_category_filter_present: bool,
    service_filter_present: bool,
    project_filter_present: bool,
    search_present: bool,
) -> None:
    attrs = {
        "endpoint": "summary",
        "result": result,
        "invoice_month_present": invoice_month_present,
        "billing_account_filter_present": billing_account_filter_present,
        "service_category_filter_present": service_category_filter_present,
        "service_filter_present": service_filter_present,
        "project_filter_present": project_filter_present,
        "search_present": search_present,
        "truncated": truncated,
        "http.status_code": http_status_code,
    }
    set_span_attributes(span, attrs)
    record_admin_cloud_cost_summary_read(
        result=result,
        truncated=truncated,
        duration_ms=duration_ms,
        http_status_code=http_status_code,
        invoice_month_present=invoice_month_present,
        billing_account_filter_present=billing_account_filter_present,
        service_category_filter_present=service_category_filter_present,
        service_filter_present=service_filter_present,
        project_filter_present=project_filter_present,
        search_present=search_present,
    )
    logger.info(_log_event_name(result), extra=attrs)


def _record_items_observability(
    *,
    span: Any,
    result: str,
    truncated: bool,
    duration_ms: float,
    http_status_code: int,
    invoice_month_present: bool,
    billing_account_filter_present: bool,
    service_category_filter_present: bool,
    service_filter_present: bool,
    project_filter_present: bool,
    search_present: bool,
) -> None:
    attrs = {
        "endpoint": "items",
        "result": result,
        "invoice_month_present": invoice_month_present,
        "billing_account_filter_present": billing_account_filter_present,
        "service_category_filter_present": service_category_filter_present,
        "service_filter_present": service_filter_present,
        "project_filter_present": project_filter_present,
        "search_present": search_present,
        "truncated": truncated,
        "http.status_code": http_status_code,
    }
    set_span_attributes(span, attrs)
    record_admin_cloud_cost_items_read(
        result=result,
        truncated=truncated,
        duration_ms=duration_ms,
        http_status_code=http_status_code,
        invoice_month_present=invoice_month_present,
        billing_account_filter_present=billing_account_filter_present,
        service_category_filter_present=service_category_filter_present,
        service_filter_present=service_filter_present,
        project_filter_present=project_filter_present,
        search_present=search_present,
    )
    logger.info(_log_event_name(result), extra=attrs)


def _log_event_name(result: str) -> str:
    if result == "config_missing":
        return "admin.cloud_costs.gcp.config_missing"
    return "admin.cloud_costs.gcp.read"


def _build_unconfigured_summary_payload(
    *,
    settings,
    invoice_month: str | None,
    error: str,
) -> dict[str, Any]:
    try:
        resolved_invoice_month = normalize_invoice_month(invoice_month)
    except ValueError:
        resolved_invoice_month = None
    if resolved_invoice_month is None:
        try:
            resolved_invoice_month = normalize_invoice_month(
                settings.gcp_billing_default_invoice_month
            )
        except ValueError:
            resolved_invoice_month = None
    return {
        "provider": "gcp",
        "configured": False,
        "source_table_fqn": None,
        "invoice_month": resolved_invoice_month or "",
        "currency": None,
        "total_cost": 0.0,
        "row_count": 0,
        "truncated": False,
        "available_filters": {
            "billing_accounts": [],
            "service_categories": [],
            "services": [],
        },
        "generated_at": _utc_now_iso(),
        "error": error,
    }


def _utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
