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


def test_execute_pipeline_browser_upload_probe_persists_success_evidence(monkeypatch):
    module = _load_module()

    staged_upload = {
        "project_id": "project-1",
        "pipeline_kind": "markdown_index_builder",
        "storage_service_slug": "index-builder",
        "source_uid": "probe-source-1",
        "pipeline_source_id": "pipeline-source-1",
        "storage_object_id": "storage-object-1",
        "reservation_id": "reservation-1",
    }
    captured: dict[str, object] = {}
    probe_run = {
        "probe_run_id": "probe-run-browser-upload-1",
        "probe_kind": "pipeline_browser_upload_probe",
        "check_id": None,
        "result": "ok",
        "duration_ms": 12.3,
        "evidence": {},
        "failure_reason": None,
        "created_at": "2026-04-08T18:30:00Z",
    }

    monkeypatch.setattr(
        module,
        "_stage_pipeline_probe_source_upload",
        lambda **_kwargs: staged_upload,
    )
    monkeypatch.setattr(
        module,
        "store_runtime_probe_run",
        lambda **kwargs: captured.update(kwargs) or probe_run,
    )

    result = module.execute_pipeline_browser_upload_probe(
        project_id="project-1",
        pipeline_kind="markdown_index_builder",
        actor_id="admin-user",
    )

    assert captured == {
        "probe_kind": "pipeline_browser_upload_probe",
        "check_id": None,
        "result": "ok",
        "duration_ms": pytest.approx(captured["duration_ms"], rel=0.01),
        "evidence": {
            "project_id": "project-1",
            "pipeline_kind": "markdown_index_builder",
            "storage_service_slug": "index-builder",
            "source_uid": "probe-source-1",
            "pipeline_source_id": "pipeline-source-1",
            "storage_object_id": "storage-object-1",
            "reservation_id": "reservation-1",
            "source_registry_verified": True,
        },
        "failure_reason": None,
        "actor_id": "admin-user",
    }
    assert result == probe_run


def test_execute_pipeline_job_execution_probe_persists_success_evidence(monkeypatch):
    module = _load_module()

    staged_source = {
        "project_id": "project-1",
        "pipeline_kind": "markdown_index_builder",
        "storage_service_slug": "index-builder",
        "source_uid": "probe-source-2",
        "pipeline_source_id": "pipeline-source-2",
        "storage_object_id": "storage-object-2",
        "reservation_id": "reservation-2",
    }
    staged_source_set = {
        "source_set_id": "source-set-1",
        "member_count": 1,
        "items": [{"source_uid": "probe-source-2", "source_order": 1}],
    }
    staged_job = {
        "job_id": "job-1",
        "pipeline_kind": "markdown_index_builder",
        "source_set_id": "source-set-1",
        "status": "complete",
        "stage": "packaging",
    }
    downloaded_deliverable = {
        "deliverable_kind": "lexical_sqlite",
        "filename": "probe.lexical.sqlite",
        "byte_size": 512,
    }
    captured: dict[str, object] = {}
    probe_run = {
        "probe_run_id": "probe-run-job-execution-1",
        "probe_kind": "pipeline_job_execution_probe",
        "check_id": None,
        "result": "ok",
        "duration_ms": 48.7,
        "evidence": {},
        "failure_reason": None,
        "created_at": "2026-04-08T18:35:00Z",
    }

    monkeypatch.setattr(
        module,
        "_stage_pipeline_probe_source_upload",
        lambda **_kwargs: staged_source,
    )
    monkeypatch.setattr(
        module,
        "_prepare_pipeline_probe_source_set",
        lambda **_kwargs: staged_source_set,
    )
    monkeypatch.setattr(
        module,
        "_run_pipeline_probe_job",
        lambda **_kwargs: staged_job,
    )
    monkeypatch.setattr(
        module,
        "_verify_pipeline_probe_deliverable_download",
        lambda **_kwargs: downloaded_deliverable,
    )
    monkeypatch.setattr(
        module,
        "store_runtime_probe_run",
        lambda **kwargs: captured.update(kwargs) or probe_run,
    )

    result = module.execute_pipeline_job_execution_probe(
        project_id="project-1",
        pipeline_kind="markdown_index_builder",
        actor_id="admin-user",
    )

    assert captured == {
        "probe_kind": "pipeline_job_execution_probe",
        "check_id": None,
        "result": "ok",
        "duration_ms": pytest.approx(captured["duration_ms"], rel=0.01),
        "evidence": {
            "project_id": "project-1",
            "pipeline_kind": "markdown_index_builder",
            "storage_service_slug": "index-builder",
            "source_uid": "probe-source-2",
            "pipeline_source_id": "pipeline-source-2",
            "source_set_id": "source-set-1",
            "source_set_member_count": 1,
            "job_id": "job-1",
            "deliverable_kind": "lexical_sqlite",
            "deliverable_filename": "probe.lexical.sqlite",
            "deliverable_download_verified": True,
        },
        "failure_reason": None,
        "actor_id": "admin-user",
    }
    assert result == probe_run
