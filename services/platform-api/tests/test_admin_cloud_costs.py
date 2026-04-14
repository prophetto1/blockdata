from __future__ import annotations

from fastapi.testclient import TestClient
import pytest
from unittest.mock import MagicMock

import app.api.routes.admin_cloud_costs as admin_cloud_costs
from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.main import create_app
from app.services.cloud_costs.gcp_billing import (
    build_gcp_billing_items_query,
    build_gcp_billing_source_table_fqn,
    normalize_invoice_month,
    validate_gcp_billing_config,
)
from app.services.cloud_costs.gcp_service_categories import (
    OTHER_GCP_SERVICE_CATEGORY,
    build_gcp_service_category_case_sql,
    categorize_gcp_service,
)


def _superuser_principal() -> AuthPrincipal:
    return AuthPrincipal(
        subject_type="user",
        subject_id="admin-user",
        roles=frozenset({"authenticated", "platform_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def _make_app(monkeypatch):
    from app.core.config import get_settings
    import app.main as main_module

    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    get_settings.cache_clear()
    monkeypatch.setattr(
        main_module,
        "init_pool",
        lambda: MagicMock(
            status=lambda: {
                "max_workers": 0,
                "max_queue_depth": 0,
                "active": 0,
                "saturated": False,
            }
        ),
    )
    monkeypatch.setattr(main_module, "shutdown_pool", lambda: None)
    monkeypatch.setattr(main_module, "start_pipeline_jobs_worker", lambda: None)
    monkeypatch.setattr(main_module, "stop_pipeline_jobs_worker", lambda: None)
    monkeypatch.setattr(main_module, "start_storage_cleanup_worker", lambda: None)
    monkeypatch.setattr(main_module, "stop_storage_cleanup_worker", lambda: None)
    monkeypatch.setattr(main_module, "start_agchain_operations_worker", lambda: None)
    monkeypatch.setattr(main_module, "stop_agchain_operations_worker", lambda: None)
    return create_app()


@pytest.fixture
def client(monkeypatch):
    from app.core.config import get_settings

    app = _make_app(monkeypatch)
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


@pytest.fixture
def superuser_client(monkeypatch):
    from app.core.config import get_settings

    app = _make_app(monkeypatch)
    app.dependency_overrides[require_superuser] = _superuser_principal
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_get_gcp_billing_summary_requires_superuser(client):
    response = client.get("/admin/cloud-costs/gcp/summary")
    assert response.status_code in (401, 403)


def test_build_gcp_billing_source_table_fqn_and_validate(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("GCP_BILLING_BIGQUERY_PROJECT_ID", "billing-prj")
    monkeypatch.setenv("GCP_BILLING_BIGQUERY_DATASET", "finops")
    monkeypatch.setenv("GCP_BILLING_BIGQUERY_TABLE", "gcp_billing_export_resource_v1_abc")
    get_settings.cache_clear()

    settings = get_settings()
    assert (
        build_gcp_billing_source_table_fqn(settings)
        == "billing-prj.finops.gcp_billing_export_resource_v1_abc"
    )
    assert (
        validate_gcp_billing_config(settings)
        == "billing-prj.finops.gcp_billing_export_resource_v1_abc"
    )


def test_categorize_gcp_service_uses_other_fallback():
    assert categorize_gcp_service("Compute Engine") == "Compute"
    assert categorize_gcp_service(" Cloud Storage ") == "Storage"
    assert categorize_gcp_service("Made Up Service") == OTHER_GCP_SERVICE_CATEGORY
    assert categorize_gcp_service(None) == OTHER_GCP_SERVICE_CATEGORY


def test_build_gcp_service_category_case_sql_preserves_category_labels():
    case_sql = build_gcp_service_category_case_sql("service.description")
    assert "THEN 'Compute'" in case_sql
    assert "THEN 'Storage'" in case_sql
    assert "ELSE 'Other'" in case_sql
    assert "LOWER(TRIM(COALESCE(service.description, '')))" in case_sql


def test_normalize_invoice_month_rejects_invalid_format():
    with pytest.raises(ValueError):
        normalize_invoice_month("2026-04")


def test_build_gcp_billing_items_query_contains_grouping_and_limit():
    query = build_gcp_billing_items_query("billing-prj.finops.billing_export")
    assert "WITH aggregated AS (" in query
    assert "GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10" in query
    assert "COUNT(*) OVER() AS total_row_count" in query
    assert "LIMIT @limit_rows" in query
    assert "service_category = @service_category" in query


def test_get_gcp_billing_summary_returns_unconfigured_payload(superuser_client):
    response = superuser_client.get("/admin/cloud-costs/gcp/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "gcp"
    assert body["configured"] is False
    assert body["source_table_fqn"] is None
    assert body["total_cost"] == 0.0
    assert body["row_count"] == 0
    assert body["available_filters"]["billing_accounts"] == []
    assert "GCP billing export is not configured" in body["error"]


def test_get_gcp_billing_summary_returns_data(superuser_client, monkeypatch):
    captured: dict[str, str | None] = {}

    def _mock_load_summary(settings, *, invoice_month, billing_account_id):
        captured["invoice_month"] = invoice_month
        captured["billing_account_id"] = billing_account_id
        return {
            "provider": "gcp",
            "configured": True,
            "source_table_fqn": "billing-prj.finops.billing_export",
            "invoice_month": "202604",
            "currency": "USD",
            "total_cost": 321.45,
            "row_count": 2,
            "truncated": False,
            "available_filters": {
                "billing_accounts": [{"id": "ABC-123", "label": "ABC-123"}],
                "service_categories": ["Compute", "Storage"],
                "services": ["Compute Engine", "Cloud Storage"],
            },
            "generated_at": "2026-04-12T10:00:00Z",
        }

    monkeypatch.setattr(
        "app.api.routes.admin_cloud_costs.load_gcp_billing_summary",
        _mock_load_summary,
    )

    response = superuser_client.get(
        "/admin/cloud-costs/gcp/summary?invoice_month=202604&billing_account_id=ABC-123"
    )

    assert response.status_code == 200
    assert captured == {
        "invoice_month": "202604",
        "billing_account_id": "ABC-123",
    }
    body = response.json()
    assert body["configured"] is True
    assert body["total_cost"] == 321.45
    assert body["available_filters"]["service_categories"] == ["Compute", "Storage"]


def test_get_gcp_cost_inventory_items_returns_truncated_payload(
    superuser_client,
    monkeypatch,
):
    captured: dict[str, str | None] = {}

    def _mock_load_items(
        settings,
        *,
        invoice_month,
        billing_account_id,
        service_category,
        service,
        project_id,
        search,
    ):
        captured.update(
            {
                "invoice_month": invoice_month,
                "billing_account_id": billing_account_id,
                "service_category": service_category,
                "service": service,
                "project_id": project_id,
                "search": search,
            }
        )
        return {
            "provider": "gcp",
            "invoice_month": "202604",
            "truncated": True,
            "row_count": 1001,
            "rows": [
                {
                    "billing_account_id": "ABC-123",
                    "service_category": "Compute",
                    "service": "Compute Engine",
                    "sku": "N2 Core",
                    "project_id": "demo-project",
                    "project_name": "Demo Project",
                    "resource_name": "vm-1",
                    "resource_global_name": "//compute.googleapis.com/projects/demo/zones/us-central1-a/instances/vm-1",
                    "location": "us-central1-a",
                    "usage_amount": 12.5,
                    "usage_unit": "h",
                    "cost": 98.12,
                    "currency": "USD",
                    "last_usage_at": "2026-04-11T23:00:00Z",
                }
            ],
            "generated_at": "2026-04-12T10:00:00Z",
        }

    monkeypatch.setattr(
        "app.api.routes.admin_cloud_costs.load_gcp_cost_inventory_items",
        _mock_load_items,
    )

    response = superuser_client.get(
        "/admin/cloud-costs/gcp/items"
        "?invoice_month=202604"
        "&billing_account_id=ABC-123"
        "&service_category=Compute"
        "&service=Compute%20Engine"
        "&project_id=demo-project"
        "&search=vm-1"
    )

    assert response.status_code == 200
    assert captured == {
        "invoice_month": "202604",
        "billing_account_id": "ABC-123",
        "service_category": "Compute",
        "service": "Compute Engine",
        "project_id": "demo-project",
        "search": "vm-1",
    }
    body = response.json()
    assert body["truncated"] is True
    assert body["row_count"] == 1001
    assert body["rows"][0]["service"] == "Compute Engine"


def test_get_gcp_cost_inventory_items_rejects_invalid_invoice_month(
    superuser_client,
):
    response = superuser_client.get(
        "/admin/cloud-costs/gcp/items?invoice_month=2026-04"
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "invoice_month must use YYYYMM format"


def test_get_gcp_cost_inventory_items_returns_503_when_unconfigured(
    superuser_client,
):
    response = superuser_client.get("/admin/cloud-costs/gcp/items")

    assert response.status_code == 503
    assert "GCP billing export is not configured" in response.json()["detail"]


def test_record_summary_observability_uses_locked_contract_attrs(monkeypatch):
    span_attrs = {}
    metric_kwargs = {}
    log_calls: list[tuple[str, dict[str, object] | None]] = []

    monkeypatch.setattr(
        admin_cloud_costs,
        "set_span_attributes",
        lambda span, attrs: span_attrs.update(attrs),
    )
    monkeypatch.setattr(
        admin_cloud_costs,
        "record_admin_cloud_cost_summary_read",
        lambda **kwargs: metric_kwargs.update(kwargs),
    )
    monkeypatch.setattr(
        admin_cloud_costs.logger,
        "info",
        lambda event, extra=None: log_calls.append((event, extra)),
    )

    admin_cloud_costs._record_summary_observability(
        span=object(),
        result="ok",
        truncated=False,
        duration_ms=12.5,
        http_status_code=200,
        invoice_month_present=True,
        billing_account_filter_present=True,
        service_category_filter_present=False,
        service_filter_present=False,
        project_filter_present=False,
        search_present=False,
    )

    expected_attrs = {
        "endpoint": "summary",
        "result": "ok",
        "invoice_month_present": True,
        "billing_account_filter_present": True,
        "service_category_filter_present": False,
        "service_filter_present": False,
        "project_filter_present": False,
        "search_present": False,
        "truncated": False,
        "http.status_code": 200,
    }
    assert span_attrs == expected_attrs
    assert metric_kwargs == {
        "result": "ok",
        "truncated": False,
        "duration_ms": 12.5,
        "http_status_code": 200,
        "invoice_month_present": True,
        "billing_account_filter_present": True,
        "service_category_filter_present": False,
        "service_filter_present": False,
        "project_filter_present": False,
        "search_present": False,
    }
    assert log_calls == [("admin.cloud_costs.gcp.read", expected_attrs)]


def test_record_summary_observability_logs_config_missing_event(monkeypatch):
    log_calls: list[tuple[str, dict[str, object] | None]] = []

    monkeypatch.setattr(admin_cloud_costs, "set_span_attributes", lambda span, attrs: None)
    monkeypatch.setattr(
        admin_cloud_costs,
        "record_admin_cloud_cost_summary_read",
        lambda **kwargs: None,
    )
    monkeypatch.setattr(
        admin_cloud_costs.logger,
        "info",
        lambda event, extra=None: log_calls.append((event, extra)),
    )

    admin_cloud_costs._record_summary_observability(
        span=object(),
        result="config_missing",
        truncated=False,
        duration_ms=2.5,
        http_status_code=200,
        invoice_month_present=False,
        billing_account_filter_present=False,
        service_category_filter_present=False,
        service_filter_present=False,
        project_filter_present=False,
        search_present=False,
    )

    assert log_calls[0][0] == "admin.cloud_costs.gcp.config_missing"


def test_record_items_observability_uses_locked_contract_attrs(monkeypatch):
    span_attrs = {}
    metric_kwargs = {}
    log_calls: list[tuple[str, dict[str, object] | None]] = []

    monkeypatch.setattr(
        admin_cloud_costs,
        "set_span_attributes",
        lambda span, attrs: span_attrs.update(attrs),
    )
    monkeypatch.setattr(
        admin_cloud_costs,
        "record_admin_cloud_cost_items_read",
        lambda **kwargs: metric_kwargs.update(kwargs),
    )
    monkeypatch.setattr(
        admin_cloud_costs.logger,
        "info",
        lambda event, extra=None: log_calls.append((event, extra)),
    )

    admin_cloud_costs._record_items_observability(
        span=object(),
        result="ok",
        truncated=True,
        duration_ms=18.0,
        http_status_code=200,
        invoice_month_present=True,
        billing_account_filter_present=True,
        service_category_filter_present=True,
        service_filter_present=True,
        project_filter_present=True,
        search_present=True,
    )

    expected_attrs = {
        "endpoint": "items",
        "result": "ok",
        "invoice_month_present": True,
        "billing_account_filter_present": True,
        "service_category_filter_present": True,
        "service_filter_present": True,
        "project_filter_present": True,
        "search_present": True,
        "truncated": True,
        "http.status_code": 200,
    }
    assert span_attrs == expected_attrs
    assert metric_kwargs == {
        "result": "ok",
        "truncated": True,
        "duration_ms": 18.0,
        "http_status_code": 200,
        "invoice_month_present": True,
        "billing_account_filter_present": True,
        "service_category_filter_present": True,
        "service_filter_present": True,
        "project_filter_present": True,
        "search_present": True,
    }
    assert log_calls == [("admin.cloud_costs.gcp.read", expected_attrs)]
