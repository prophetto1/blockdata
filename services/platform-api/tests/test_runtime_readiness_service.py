from __future__ import annotations
import os

from types import SimpleNamespace

from app.services.runtime_readiness import (
    check_agchain_benchmarks_catalog,
    check_blockdata_storage_bucket_config,
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
    assert result["cause"] == "The active credential cannot sign URLs directly."
    assert result["cause_confidence"] == "high"
    assert result["actionability"] == "backend_action"
    assert result["evidence"]["signing_mode"] == "local_private_key_required"
    assert result["evidence"]["error_type"] == "AttributeError"
    assert result["evidence"]["error_reason"] == "missing_private_key"
    assert result["verify_after"] == [
        {
            "probe_kind": "storage_signed_upload",
            "label": "Retry the signed upload URL probe",
            "route": "/admin/runtime/readiness?surface=blockdata",
        }
    ]
    assert result["next_if_still_failing"] == [
        {
            "step_kind": "manual_fix",
            "label": "Inspect the runtime credential chain",
            "description": "Verify whether the process is running with a signer-capable service account or key file.",
        }
    ]
    assert "private key" in result["summary"].lower()


def test_signed_url_signing_returns_transport_error_detail_for_signblob_scope_failures(monkeypatch):
    class TransportError(Exception):
        pass

    message = (
        "Error calling the IAM signBytes API: "
        "b'{\"error\":{\"code\":403,\"status\":\"PERMISSION_DENIED\",\"details\":["
        "{\"@type\":\"type.googleapis.com/google.rpc.ErrorInfo\",\"reason\":\"ACCESS_TOKEN_SCOPE_INSUFFICIENT\","
        "\"domain\":\"googleapis.com\",\"metadata\":{\"service\":\"iamcredentials.googleapis.com\","
        "\"method\":\"google.iam.credentials.v1.IAMCredentials.SignBlob\"}}]}}'"
    )

    monkeypatch.setattr(
        "app.services.runtime_readiness.create_signed_upload_url",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(TransportError(message)),
    )

    result = check_blockdata_storage_signed_url_signing(
        SimpleNamespace(gcs_user_storage_bucket="blockdata-user-content-dev")
    )

    assert result["status"] == "fail"
    assert result["cause"] == "The runtime reached IAM signBlob, but the access token lacks the required OAuth scope."
    assert result["cause_confidence"] == "high"
    assert result["actionability"] == "backend_action"
    assert result["evidence"]["bucket_name"] == "blockdata-user-content-dev"
    assert result["evidence"]["signing_mode"] == "iam_signblob"
    assert result["evidence"]["error_type"] == "TransportError"
    assert result["evidence"]["error_status"] == "PERMISSION_DENIED"
    assert result["evidence"]["error_reason"] == "ACCESS_TOKEN_SCOPE_INSUFFICIENT"
    assert result["evidence"]["error_service"] == "iamcredentials.googleapis.com"
    assert result["evidence"]["error_method"] == "google.iam.credentials.v1.IAMCredentials.SignBlob"
    assert result["verify_after"] == [
        {
            "probe_kind": "storage_signed_upload",
            "label": "Retry the signed upload URL probe",
            "route": "/admin/runtime/readiness?surface=blockdata",
        }
    ]
    assert result["next_if_still_failing"] == [
        {
            "step_kind": "escalate",
            "label": "Escalate the runtime credential scope mismatch",
            "description": "Inspect the Cloud Run credential path and ensure IAM Credentials calls use a cloud-platform scoped access token.",
        }
    ]


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
    assert result["evidence"]["bucket_name"] == "blockdata-user-content-dev"
    assert result["evidence"]["cors_rule_count"] == 0
    assert result["evidence"]["allowed_origins"] == []
    assert result["evidence"]["allowed_methods"] == []
    assert result["evidence"]["allowed_response_headers"] == []
    assert result["cause"] == "The bucket has no browser-upload CORS rules."
    assert result["cause_confidence"] == "high"
    assert result["actionability"] == "backend_action"
    assert result["available_actions"] == [
        {
            "action_kind": "storage_browser_upload_cors_reconcile",
            "label": "Reconcile bucket CORS policy",
            "description": "Apply the checked-in browser upload CORS policy to the user-storage bucket.",
            "route": "/admin/runtime/storage/browser-upload-cors/reconcile",
            "requires_confirmation": True,
        }
    ]
    assert "cors" in result["remediation"].lower()


def test_platform_api_ready_returns_unknown_when_conversion_pool_status_raises(monkeypatch):
    fake_pool = SimpleNamespace(
        status=lambda: (_ for _ in ()).throw(PermissionError("pool status unavailable"))
    )
    monkeypatch.setattr("app.services.runtime_readiness.get_conversion_pool", lambda: fake_pool)
    monkeypatch.setenv("K_SERVICE", "blockdata-platform-api")
    monkeypatch.setenv("K_REVISION", "blockdata-platform-api-00067-6pm")
    monkeypatch.setenv("K_CONFIGURATION", "blockdata-platform-api")

    fake_client = SimpleNamespace(
        _credentials=SimpleNamespace(service_account_email="blockdata-platform-api-sa@agchain.iam.gserviceaccount.com"),
    )
    monkeypatch.setattr("app.services.runtime_readiness._gcs_client", lambda: fake_client)

    result = check_shared_platform_api_ready(SimpleNamespace())

    assert result["id"] == "shared.platform_api.ready"
    assert result["status"] == "unknown"
    assert result["evidence"]["ready"] is False
    assert result["evidence"]["error_type"] == "PermissionError"
    assert result["evidence"]["runtime_environment"] == "cloud_run"
    assert result["evidence"]["service_name"] == "blockdata-platform-api"
    assert result["evidence"]["revision_name"] == "blockdata-platform-api-00067-6pm"
    assert result["evidence"]["configuration_name"] == "blockdata-platform-api"
    assert result["evidence"]["service_account_email"] == "blockdata-platform-api-sa@agchain.iam.gserviceaccount.com"
    assert result["evidence"]["credential_class"] == "SimpleNamespace"
    assert result["cause"] == "The process is running, but conversion-pool state could not be inspected."
    assert result["cause_confidence"] == "medium"
    assert result["actionability"] == "backend_probe"
    assert "could not be evaluated" in result["summary"].lower()


def test_bucket_config_returns_richer_evidence():
    settings = SimpleNamespace(
        gcs_user_storage_bucket="blockdata-user-content-dev",
        user_storage_max_file_bytes=1073741824,
        storage_cleanup_interval_seconds=300,
    )

    result = check_blockdata_storage_bucket_config(settings)

    assert result["status"] == "ok"
    assert result["cause"] == "The runtime has an explicit user-storage bucket configured."
    assert result["cause_confidence"] == "high"
    assert result["actionability"] == "info_only"
    assert result["evidence"] == {
        "has_bucket": True,
        "bucket_name": "blockdata-user-content-dev",
        "max_file_bytes": 1073741824,
        "cleanup_interval_seconds": 300,
    }


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
        gcs_user_storage_bucket=None,
        user_storage_max_file_bytes=1073741824,
        storage_cleanup_interval_seconds=300,
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
