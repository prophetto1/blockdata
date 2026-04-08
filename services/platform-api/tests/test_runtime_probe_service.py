from __future__ import annotations

import importlib
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


def _load_module():
    try:
        return importlib.import_module("app.services.runtime_probe_service")
    except ModuleNotFoundError as exc:  # pragma: no cover - red phase path
        pytest.fail(f"runtime_probe_service module missing: {exc}")


def test_store_runtime_action_run_persists_row_payload():
    module = _load_module()

    persisted = {
        "action_run_id": "action-run-1",
        "action_kind": "storage_browser_upload_cors_reconcile",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "ok",
        "duration_ms": 18.4,
        "request": {"confirmed": True},
        "result_payload": {"bucket_name": "blockdata-user-content-dev"},
        "failure_reason": None,
        "created_at": "2026-04-08T16:00:00Z",
    }
    table = MagicMock()
    table.insert.return_value.execute.return_value = SimpleNamespace(data=[persisted])
    admin = MagicMock()
    admin.table.return_value = table

    result = module.store_runtime_action_run(
        action_kind="storage_browser_upload_cors_reconcile",
        check_id="blockdata.storage.bucket_cors",
        result="ok",
        duration_ms=18.4,
        request={"confirmed": True},
        result_payload={"bucket_name": "blockdata-user-content-dev"},
        failure_reason=None,
        actor_id="admin-user",
        supabase_admin=admin,
    )

    admin.table.assert_called_once_with("runtime_action_runs")
    table.insert.assert_called_once_with(
        {
            "action_kind": "storage_browser_upload_cors_reconcile",
            "check_id": "blockdata.storage.bucket_cors",
            "result": "ok",
            "duration_ms": 18.4,
            "request": {"confirmed": True},
            "result_payload": {"bucket_name": "blockdata-user-content-dev"},
            "failure_reason": None,
            "actor_id": "admin-user",
        }
    )
    assert result == persisted


def test_store_runtime_probe_run_persists_row_payload():
    module = _load_module()

    persisted = {
        "probe_run_id": "probe-run-1",
        "probe_kind": "readiness_check_verify",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "fail",
        "duration_ms": 9.1,
        "evidence": {"status": "fail", "surface_id": "blockdata"},
        "failure_reason": "Bucket browser-upload CORS rules are missing or incomplete.",
        "created_at": "2026-04-08T16:05:00Z",
    }
    table = MagicMock()
    table.insert.return_value.execute.return_value = SimpleNamespace(data=[persisted])
    admin = MagicMock()
    admin.table.return_value = table

    result = module.store_runtime_probe_run(
        probe_kind="readiness_check_verify",
        check_id="blockdata.storage.bucket_cors",
        result="fail",
        duration_ms=9.1,
        evidence={"status": "fail", "surface_id": "blockdata"},
        failure_reason="Bucket browser-upload CORS rules are missing or incomplete.",
        actor_id="admin-user",
        supabase_admin=admin,
    )

    admin.table.assert_called_once_with("runtime_probe_runs")
    table.insert.assert_called_once_with(
        {
            "probe_kind": "readiness_check_verify",
            "check_id": "blockdata.storage.bucket_cors",
            "result": "fail",
            "duration_ms": 9.1,
            "evidence": {"status": "fail", "surface_id": "blockdata"},
            "failure_reason": "Bucket browser-upload CORS rules are missing or incomplete.",
            "actor_id": "admin-user",
        }
    )
    assert result == persisted


def test_verify_runtime_readiness_check_records_probe_and_returns_detail(monkeypatch):
    module = _load_module()

    check = {
        "id": "blockdata.storage.bucket_cors",
        "check_id": "blockdata.storage.bucket_cors",
        "surface_id": "blockdata",
        "status": "fail",
        "summary": "Bucket browser-upload CORS rules are missing or incomplete.",
        "evidence": {"cors_configured": False},
        "label": "Bucket CORS",
    }
    captured: dict[str, object] = {}
    probe_run = {
        "probe_run_id": "probe-run-verify-1",
        "probe_kind": "readiness_check_verify",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "fail",
        "duration_ms": 4.2,
        "evidence": {
            "status": "fail",
            "surface_id": "blockdata",
            "check_summary": "Bucket browser-upload CORS rules are missing or incomplete.",
            "check_evidence": {"cors_configured": False},
        },
        "failure_reason": "Bucket browser-upload CORS rules are missing or incomplete.",
        "created_at": "2026-04-08T16:10:00Z",
    }

    monkeypatch.setattr(
        module,
        "get_runtime_readiness_check",
        lambda **_kwargs: check,
    )
    monkeypatch.setattr(
        module,
        "store_runtime_probe_run",
        lambda **kwargs: captured.update(kwargs) or probe_run,
    )
    monkeypatch.setattr(
        module,
        "get_latest_runtime_action_run_for_check",
        lambda **_kwargs: None,
    )

    result = module.verify_runtime_readiness_check(
        check_id="blockdata.storage.bucket_cors",
        actor_id="admin-user",
    )

    assert captured == {
        "probe_kind": "readiness_check_verify",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "fail",
        "duration_ms": pytest.approx(captured["duration_ms"], rel=0.01),
        "evidence": {
            "status": "fail",
            "surface_id": "blockdata",
            "check_summary": "Bucket browser-upload CORS rules are missing or incomplete.",
            "check_evidence": {"cors_configured": False},
        },
        "failure_reason": "Bucket browser-upload CORS rules are missing or incomplete.",
        "actor_id": "admin-user",
    }
    assert result == {
        "check": check,
        "latest_probe_run": probe_run,
        "latest_action_run": None,
    }
