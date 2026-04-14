from __future__ import annotations

from opentelemetry import metrics, trace

from app.observability.contract import safe_attributes

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

summary_read_counter = meter.create_counter(
    "platform.admin.cloud_costs.gcp.summary.read.count"
)
items_read_counter = meter.create_counter(
    "platform.admin.cloud_costs.gcp.items.read.count"
)
read_duration_ms = meter.create_histogram(
    "platform.admin.cloud_costs.gcp.read.duration_ms"
)


def record_admin_cloud_cost_summary_read(
    *,
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
    attrs = _metric_attributes(
        endpoint="summary",
        result=result,
        truncated=truncated,
        http_status_code=http_status_code,
        invoice_month_present=invoice_month_present,
        billing_account_filter_present=billing_account_filter_present,
        service_category_filter_present=service_category_filter_present,
        service_filter_present=service_filter_present,
        project_filter_present=project_filter_present,
        search_present=search_present,
    )
    summary_read_counter.add(1, attrs)
    read_duration_ms.record(duration_ms, attrs)


def record_admin_cloud_cost_items_read(
    *,
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
    attrs = _metric_attributes(
        endpoint="items",
        result=result,
        truncated=truncated,
        http_status_code=http_status_code,
        invoice_month_present=invoice_month_present,
        billing_account_filter_present=billing_account_filter_present,
        service_category_filter_present=service_category_filter_present,
        service_filter_present=service_filter_present,
        project_filter_present=project_filter_present,
        search_present=search_present,
    )
    items_read_counter.add(1, attrs)
    read_duration_ms.record(duration_ms, attrs)


def _metric_attributes(
    *,
    endpoint: str,
    result: str,
    truncated: bool,
    http_status_code: int,
    invoice_month_present: bool,
    billing_account_filter_present: bool,
    service_category_filter_present: bool,
    service_filter_present: bool,
    project_filter_present: bool,
    search_present: bool,
) -> dict[str, object]:
    return safe_attributes(
        {
            "endpoint": endpoint,
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
    )
