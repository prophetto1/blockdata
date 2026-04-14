from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
import re
from typing import Any, Sequence, TypedDict

from google.cloud import bigquery

from app.core.config import Settings
from app.services.cloud_costs.gcp_service_categories import (
    build_gcp_service_category_case_sql,
)

INVOICE_MONTH_PATTERN = re.compile(r"^\d{6}$")
GCP_BILLING_ITEMS_RESPONSE_LIMIT = 1000


class BillingAccountFilter(TypedDict):
    id: str
    label: str


class GcpCostInventoryRow(TypedDict):
    billing_account_id: str
    service_category: str
    service: str
    sku: str
    project_id: str | None
    project_name: str | None
    resource_name: str | None
    resource_global_name: str | None
    location: str | None
    usage_amount: float | None
    usage_unit: str | None
    cost: float
    currency: str | None
    last_usage_at: str | None


class GcpBillingSummary(TypedDict):
    provider: str
    configured: bool
    source_table_fqn: str | None
    invoice_month: str
    currency: str | None
    total_cost: float
    row_count: int
    truncated: bool
    available_filters: dict[str, list[Any]]
    generated_at: str


class GcpBillingItemsResponse(TypedDict):
    provider: str
    invoice_month: str
    truncated: bool
    row_count: int
    rows: list[GcpCostInventoryRow]
    generated_at: str


class GcpBillingConfigurationError(RuntimeError):
    pass


class GcpBillingQueryError(RuntimeError):
    pass


def build_gcp_billing_source_table_fqn(settings: Settings) -> str | None:
    project_id = _normalize_optional_text(settings.gcp_billing_bigquery_project_id)
    dataset = _normalize_optional_text(settings.gcp_billing_bigquery_dataset)
    table = _normalize_optional_text(settings.gcp_billing_bigquery_table)
    if not project_id or not dataset or not table:
        return None
    return f"{project_id}.{dataset}.{table}"


def validate_gcp_billing_config(settings: Settings) -> str:
    source_table_fqn = build_gcp_billing_source_table_fqn(settings)
    if source_table_fqn is None:
        raise GcpBillingConfigurationError(
            "GCP billing export is not configured. Set "
            "GCP_BILLING_BIGQUERY_PROJECT_ID, GCP_BILLING_BIGQUERY_DATASET, "
            "and GCP_BILLING_BIGQUERY_TABLE."
        )
    return source_table_fqn


def load_gcp_billing_summary(
    settings: Settings,
    *,
    invoice_month: str | None = None,
    billing_account_id: str | None = None,
) -> GcpBillingSummary:
    source_table_fqn = validate_gcp_billing_config(settings)
    active_invoice_month = resolve_gcp_billing_invoice_month(
        settings,
        requested_invoice_month=invoice_month,
        billing_account_id=billing_account_id,
    )
    rows = _execute_query(
        settings,
        build_gcp_billing_summary_query(source_table_fqn),
        _base_query_parameters(
            invoice_month=active_invoice_month,
            billing_account_id=billing_account_id,
        ),
    )
    row = rows[0] if rows else {}
    return {
        "provider": "gcp",
        "configured": True,
        "source_table_fqn": source_table_fqn,
        "invoice_month": active_invoice_month,
        "currency": _as_optional_string(_row_value(row, "currency")),
        "total_cost": _as_float(_row_value(row, "total_cost")) or 0.0,
        "row_count": _as_int(_row_value(row, "row_count")) or 0,
        "truncated": False,
        "available_filters": {
            "billing_accounts": _normalize_billing_accounts(
                _row_value(row, "billing_accounts")
            ),
            "service_categories": _normalize_string_list(
                _row_value(row, "service_categories")
            ),
            "services": _normalize_string_list(_row_value(row, "services")),
        },
        "generated_at": _utc_now_iso(),
    }


def load_gcp_cost_inventory_items(
    settings: Settings,
    *,
    invoice_month: str | None = None,
    billing_account_id: str | None = None,
    service_category: str | None = None,
    service: str | None = None,
    project_id: str | None = None,
    search: str | None = None,
) -> GcpBillingItemsResponse:
    source_table_fqn = validate_gcp_billing_config(settings)
    active_invoice_month = resolve_gcp_billing_invoice_month(
        settings,
        requested_invoice_month=invoice_month,
        billing_account_id=billing_account_id,
    )
    rows = _execute_query(
        settings,
        build_gcp_billing_items_query(source_table_fqn),
        [
            *_base_query_parameters(
                invoice_month=active_invoice_month,
                billing_account_id=billing_account_id,
            ),
            bigquery.ScalarQueryParameter(
                "service_category",
                "STRING",
                _normalize_optional_text(service_category),
            ),
            bigquery.ScalarQueryParameter(
                "service",
                "STRING",
                _normalize_optional_text(service),
            ),
            bigquery.ScalarQueryParameter(
                "project_id",
                "STRING",
                _normalize_optional_text(project_id),
            ),
            bigquery.ScalarQueryParameter(
                "search",
                "STRING",
                _normalize_optional_text(search),
            ),
            bigquery.ScalarQueryParameter(
                "limit_rows",
                "INT64",
                GCP_BILLING_ITEMS_RESPONSE_LIMIT + 1,
            ),
        ],
    )
    total_row_count = _as_int(_row_value(rows[0], "total_row_count")) or 0 if rows else 0
    truncated = len(rows) > GCP_BILLING_ITEMS_RESPONSE_LIMIT
    visible_rows = rows[:GCP_BILLING_ITEMS_RESPONSE_LIMIT]
    return {
        "provider": "gcp",
        "invoice_month": active_invoice_month,
        "truncated": truncated,
        "row_count": total_row_count,
        "rows": [_normalize_inventory_row(row) for row in visible_rows],
        "generated_at": _utc_now_iso(),
    }


def resolve_gcp_billing_invoice_month(
    settings: Settings,
    *,
    requested_invoice_month: str | None,
    billing_account_id: str | None = None,
) -> str:
    explicit = normalize_invoice_month(requested_invoice_month)
    if explicit is not None:
        return explicit

    configured_default = normalize_invoice_month(
        settings.gcp_billing_default_invoice_month
    )
    if configured_default is not None:
        return configured_default

    source_table_fqn = validate_gcp_billing_config(settings)
    rows = _execute_query(
        settings,
        build_gcp_billing_latest_invoice_month_query(source_table_fqn),
        [
            bigquery.ScalarQueryParameter(
                "billing_account_id",
                "STRING",
                _normalize_optional_text(billing_account_id),
            )
        ],
    )
    if not rows:
        raise GcpBillingQueryError(
            "No invoice month was found in the configured GCP billing export."
        )
    invoice_month = _as_optional_string(_row_value(rows[0], "invoice_month"))
    if invoice_month is None:
        raise GcpBillingQueryError(
            "The configured GCP billing export returned an empty invoice month."
        )
    return invoice_month


def normalize_invoice_month(value: str | None) -> str | None:
    normalized = _normalize_optional_text(value)
    if normalized is None:
        return None
    if not INVOICE_MONTH_PATTERN.fullmatch(normalized):
        raise ValueError("invoice_month must use YYYYMM format")
    return normalized


def build_gcp_billing_latest_invoice_month_query(source_table_fqn: str) -> str:
    return f"""
SELECT
  invoice.month AS invoice_month
FROM `{source_table_fqn}`
WHERE invoice.month IS NOT NULL
  AND (@billing_account_id IS NULL OR billing_account_id = @billing_account_id)
GROUP BY invoice_month
ORDER BY invoice_month DESC
LIMIT 1
""".strip()


def build_gcp_billing_summary_query(source_table_fqn: str) -> str:
    aggregated_cte = _build_aggregated_costs_cte(source_table_fqn)
    return f"""
{aggregated_cte}
SELECT
  @invoice_month AS invoice_month,
  ANY_VALUE(currency) AS currency,
  COALESCE(SUM(cost), 0) AS total_cost,
  COUNT(*) AS row_count,
  ARRAY(
    SELECT AS STRUCT account_id AS id, account_id AS label
    FROM (
      SELECT DISTINCT billing_account_id AS account_id
      FROM aggregated
      WHERE billing_account_id IS NOT NULL
    )
    ORDER BY account_id
  ) AS billing_accounts,
  ARRAY(
    SELECT category
    FROM (
      SELECT DISTINCT service_category AS category
      FROM aggregated
      WHERE service_category IS NOT NULL
    )
    ORDER BY category
  ) AS service_categories,
  ARRAY(
    SELECT service_name
    FROM (
      SELECT DISTINCT service AS service_name
      FROM aggregated
      WHERE service IS NOT NULL
    )
    ORDER BY service_name
  ) AS services
FROM aggregated
""".strip()


def build_gcp_billing_items_query(source_table_fqn: str) -> str:
    aggregated_cte = _build_aggregated_costs_cte(source_table_fqn)
    return f"""
{aggregated_cte},
filtered AS (
  SELECT *
  FROM aggregated
  WHERE (@service_category IS NULL OR service_category = @service_category)
    AND (@service IS NULL OR service = @service)
    AND (@project_id IS NULL OR project_id = @project_id)
    AND (
      @search IS NULL
      OR LOWER(COALESCE(service_category, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(service, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(sku, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(project_id, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(project_name, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(resource_name, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(resource_global_name, '')) LIKE CONCAT('%', LOWER(@search), '%')
      OR LOWER(COALESCE(location, '')) LIKE CONCAT('%', LOWER(@search), '%')
    )
)
SELECT
  invoice_month,
  billing_account_id,
  service_category,
  service,
  sku,
  project_id,
  project_name,
  resource_name,
  resource_global_name,
  location,
  usage_amount,
  usage_unit,
  cost,
  currency,
  last_usage_at,
  COUNT(*) OVER() AS total_row_count
FROM filtered
ORDER BY
  cost DESC,
  service_category ASC,
  service ASC,
  sku ASC,
  project_id ASC,
  resource_name ASC,
  resource_global_name ASC
LIMIT @limit_rows
""".strip()


def _build_aggregated_costs_cte(source_table_fqn: str) -> str:
    service_category_case = build_gcp_service_category_case_sql("service.description")
    return f"""
WITH aggregated AS (
  SELECT
    invoice.month AS invoice_month,
    billing_account_id,
    {service_category_case} AS service_category,
    service.description AS service,
    sku.description AS sku,
    project.id AS project_id,
    project.name AS project_name,
    resource.name AS resource_name,
    resource.global_name AS resource_global_name,
    COALESCE(location.location, location.region, location.zone, location.country) AS location,
    SUM(usage.amount) AS usage_amount,
    ANY_VALUE(usage.unit) AS usage_unit,
    (
      SUM(CAST(cost * 1000000 AS INT64))
      + SUM(
          IFNULL(
            (SELECT SUM(CAST(c.amount * 1000000 AS INT64)) FROM UNNEST(credits) AS c),
            0
          )
        )
    ) / 1000000 AS cost,
    ANY_VALUE(currency) AS currency,
    MAX(usage_end_time) AS last_usage_at
  FROM `{source_table_fqn}`
  WHERE invoice.month = @invoice_month
    AND (@billing_account_id IS NULL OR billing_account_id = @billing_account_id)
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
)
""".strip()


def _base_query_parameters(
    *,
    invoice_month: str,
    billing_account_id: str | None,
) -> list[bigquery.ScalarQueryParameter]:
    return [
        bigquery.ScalarQueryParameter(
            "invoice_month",
            "STRING",
            normalize_invoice_month(invoice_month),
        ),
        bigquery.ScalarQueryParameter(
            "billing_account_id",
            "STRING",
            _normalize_optional_text(billing_account_id),
        ),
    ]


@lru_cache(maxsize=8)
def _get_bigquery_client(project_id: str) -> bigquery.Client:
    return bigquery.Client(project=project_id)


def _execute_query(
    settings: Settings,
    query: str,
    parameters: Sequence[bigquery.ScalarQueryParameter],
) -> list[Any]:
    client = _get_bigquery_client(
        settings.gcp_billing_bigquery_project_id or ""
    )
    job_config = bigquery.QueryJobConfig(query_parameters=list(parameters))
    job_config.use_legacy_sql = False
    return list(client.query(query, job_config=job_config).result())


def _normalize_inventory_row(row: Any) -> GcpCostInventoryRow:
    return {
        "billing_account_id": _as_optional_string(
            _row_value(row, "billing_account_id")
        )
        or "",
        "service_category": _as_optional_string(
            _row_value(row, "service_category")
        )
        or "",
        "service": _as_optional_string(_row_value(row, "service")) or "",
        "sku": _as_optional_string(_row_value(row, "sku")) or "",
        "project_id": _as_optional_string(_row_value(row, "project_id")),
        "project_name": _as_optional_string(_row_value(row, "project_name")),
        "resource_name": _as_optional_string(_row_value(row, "resource_name")),
        "resource_global_name": _as_optional_string(
            _row_value(row, "resource_global_name")
        ),
        "location": _as_optional_string(_row_value(row, "location")),
        "usage_amount": _as_float(_row_value(row, "usage_amount")),
        "usage_unit": _as_optional_string(_row_value(row, "usage_unit")),
        "cost": _as_float(_row_value(row, "cost")) or 0.0,
        "currency": _as_optional_string(_row_value(row, "currency")),
        "last_usage_at": _as_iso_datetime(_row_value(row, "last_usage_at")),
    }


def _normalize_billing_accounts(value: Any) -> list[BillingAccountFilter]:
    if not value:
        return []
    accounts: list[BillingAccountFilter] = []
    for item in value:
        account_id = _as_optional_string(_row_value(item, "id"))
        label = _as_optional_string(_row_value(item, "label"))
        if account_id is None or label is None:
            continue
        accounts.append({"id": account_id, "label": label})
    return accounts


def _normalize_string_list(value: Any) -> list[str]:
    if not value:
        return []
    normalized: list[str] = []
    for item in value:
        text = _as_optional_string(item)
        if text is not None:
            normalized.append(text)
    return normalized


def _row_value(row: Any, key: str) -> Any:
    if row is None:
        return None
    if isinstance(row, dict):
        return row.get(key)
    keys = getattr(row, "keys", None)
    if callable(keys):
        try:
            if key in keys():
                return row[key]
        except Exception:
            pass
    try:
        return row[key]
    except Exception:
        return getattr(row, key, None)


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _as_optional_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def _as_iso_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat().replace("+00:00", "Z")
    return _as_optional_string(value)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
