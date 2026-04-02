from __future__ import annotations

from types import SimpleNamespace

from app.services.runtime_readiness import (
    check_agchain_benchmarks_catalog,
    check_shared_platform_api_ready,
    check_blockdata_storage_bucket_cors,
    check_blockdata_storage_signed_url_signing,
    get_runtime_readiness_snapshot,
)


def test_signed_url_signing_returns_fail_when_current_credentials_cannot_sign(monkeypatch):
    monkeypatch.setattr(
        "app.services.runtime_readiness.create_signed_upload_url",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AttributeError("you need a private key to sign credentials")
        ),
    )

    result = check_blockdata_storage_signed_url_signing(
        SimpleNamespace(gcs_user_storage_bucket="blockdata-user-content-dev")
    )

    assert result["id"] == "blockdata.storage.signed_url_signing"
    assert result["status"] == "fail"
    assert result["evidence"]["has_signing_credentials"] is False
    assert "private key" in result["summary"].lower()


def test_bucket_cors_returns_fail_when_no_browser_upload_rules_exist(monkeypatch):
    fake_client = SimpleNamespace(
        bucket=lambda _name: SimpleNamespace(cors=[]),
    )
    monkeypatch.setattr("app.services.runtime_readiness._gcs_client", lambda: fake_client)

    result = check_blockdata_storage_bucket_cors(
        SimpleNamespace(gcs_user_storage_bucket="blockdata-user-content-dev")
    )

    assert result["id"] == "blockdata.storage.bucket_cors"
    assert result["status"] == "fail"
    assert result["evidence"]["cors_configured"] is False
    assert "cors" in result["remediation"].lower()


def test_platform_api_ready_returns_unknown_when_conversion_pool_status_raises(monkeypatch):
    fake_pool = SimpleNamespace(
        status=lambda: (_ for _ in ()).throw(PermissionError("pool status unavailable"))
    )
    monkeypatch.setattr("app.services.runtime_readiness.get_conversion_pool", lambda: fake_pool)

    result = check_shared_platform_api_ready(SimpleNamespace())

    assert result["id"] == "shared.platform_api.ready"
    assert result["status"] == "unknown"
    assert result["evidence"]["ready"] is False
    assert result["evidence"]["error_type"] == "PermissionError"
    assert "could not be evaluated" in result["summary"].lower()


def test_agchain_benchmarks_catalog_uses_paginated_registry_contract(monkeypatch):
    captured: dict[str, object] = {}

    def _mock_list_benchmarks(**kwargs):
        captured.update(kwargs)
        return {
            "items": [
                {"benchmark_id": "bench-1"},
                {"benchmark_id": "bench-2"},
            ],
            "next_cursor": None,
        }

    monkeypatch.setattr("app.services.runtime_readiness.list_benchmarks", _mock_list_benchmarks)

    result = check_agchain_benchmarks_catalog(SimpleNamespace(), actor_id="user-123")

    assert result["id"] == "agchain.benchmarks.catalog"
    assert result["status"] == "ok"
    assert result["evidence"]["catalog_count"] == 2
    assert captured == {
        "user_id": "user-123",
        "project_id": None,
        "search": None,
        "state": None,
        "validation_status": None,
        "has_active_runs": None,
        "limit": 100,
        "cursor": None,
        "offset": 0,
    }


def test_agchain_benchmarks_catalog_returns_fail_when_registry_raises_type_error(monkeypatch):
    monkeypatch.setattr(
        "app.services.runtime_readiness.list_benchmarks",
        lambda **_kwargs: (_ for _ in ()).throw(TypeError("wrong call signature")),
    )

    result = check_agchain_benchmarks_catalog(SimpleNamespace(), actor_id="user-123")

    assert result["id"] == "agchain.benchmarks.catalog"
    assert result["status"] == "fail"
    assert result["evidence"]["catalog_count"] == 0
    assert result["evidence"]["error_type"] == "TypeError"


def test_runtime_readiness_snapshot_degrades_when_check_observability_raises(monkeypatch):
    settings = SimpleNamespace(
        supabase_url="http://localhost:54321",
        supabase_service_role_key="fake-key",
        otel_enabled=False,
        otel_exporter_otlp_protocol="http/protobuf",
    )
    fake_pool = SimpleNamespace(status=lambda: {"saturated": False, "pool_size": 2, "active_tasks": 0})
    fake_admin = SimpleNamespace(
        auth=SimpleNamespace(
            admin=SimpleNamespace(list_users=lambda **_kwargs: SimpleNamespace())
        )
    )

    monkeypatch.setattr("app.services.runtime_readiness.get_settings", lambda: settings)
    monkeypatch.setattr("app.services.runtime_readiness.get_conversion_pool", lambda: fake_pool)
    monkeypatch.setattr("app.services.runtime_readiness.get_supabase_admin", lambda: fake_admin)
    monkeypatch.setattr(
        "app.services.runtime_readiness.get_telemetry_status",
        lambda _settings: {"enabled": False, "protocol": "http/protobuf"},
    )
    monkeypatch.setattr(
        "app.services.runtime_readiness.record_runtime_readiness_check",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("metrics unavailable")),
    )

    snapshot = get_runtime_readiness_snapshot(surface="shared", actor_id="admin-user")

    assert snapshot["summary"] == {"ok": 0, "warn": 0, "fail": 0, "unknown": 4}
    assert [check["id"] for check in snapshot["surfaces"][0]["checks"]] == [
        "shared.platform_api.ready",
        "shared.supabase.admin_connectivity",
        "shared.background_workers.config",
        "shared.observability.telemetry_config",
    ]
    assert all(check["status"] == "unknown" for check in snapshot["surfaces"][0]["checks"])
