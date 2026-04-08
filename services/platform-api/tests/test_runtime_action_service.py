from __future__ import annotations

import importlib
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


def _load_module():
    try:
        return importlib.import_module("app.services.runtime_action_service")
    except ModuleNotFoundError as exc:  # pragma: no cover - red phase path
        pytest.fail(f"runtime_action_service module missing: {exc}")


def test_reconcile_storage_browser_upload_cors_applies_checked_in_policy(tmp_path, monkeypatch):
    module = _load_module()

    cors_rules = [
        {
            "origin": ["http://localhost:5374", "https://blockdata.run"],
            "method": ["PUT", "GET", "HEAD", "OPTIONS"],
            "responseHeader": ["Content-Type", "ETag"],
            "maxAgeSeconds": 3600,
        }
    ]
    artifact_path = tmp_path / "user-storage-cors.json"
    artifact_path.write_text(json.dumps(cors_rules), encoding="utf-8")

    patch_calls: list[dict[str, object]] = []
    reload_calls: list[dict[str, object]] = []
    fake_bucket = SimpleNamespace(
        cors=[],
        patch=lambda **kwargs: patch_calls.append(kwargs),
        reload=lambda **kwargs: reload_calls.append(kwargs),
    )
    fake_client = SimpleNamespace(bucket=lambda bucket_name: fake_bucket if bucket_name == "blockdata-user-content-dev" else None)
    mock_logger = MagicMock()

    monkeypatch.setattr(module, "CORS_POLICY_PATH", artifact_path)
    monkeypatch.setattr(module, "_gcs_client", lambda: fake_client)
    monkeypatch.setattr(module, "logger", mock_logger)

    result = module.reconcile_storage_browser_upload_cors(
        actor_id="admin-user",
        settings=SimpleNamespace(gcs_user_storage_bucket="blockdata-user-content-dev"),
    )

    assert fake_bucket.cors == cors_rules
    assert patch_calls == [{"timeout": 10}]
    assert reload_calls == [{"timeout": 10}]
    assert result["action_kind"] == "storage_browser_upload_cors_reconcile"
    assert result["check_id"] == "blockdata.storage.bucket_cors"
    assert result["result"] == "success"
    assert result["result_payload"] == {
        "bucket_name": "blockdata-user-content-dev",
        "cors_rule_count": 1,
        "allowed_origins": ["http://localhost:5374", "https://blockdata.run"],
        "allowed_methods": ["GET", "HEAD", "OPTIONS", "PUT"],
        "allowed_response_headers": ["Content-Type", "ETag"],
    }
    mock_logger.info.assert_called_once()


def test_reconcile_storage_browser_upload_cors_logs_failure_and_raises(tmp_path, monkeypatch):
    module = _load_module()

    artifact_path = tmp_path / "user-storage-cors.json"
    artifact_path.write_text("[]", encoding="utf-8")

    fake_bucket = SimpleNamespace(
        cors=[],
        patch=lambda **_kwargs: (_ for _ in ()).throw(ValueError("bucket patch failed")),
    )
    fake_client = SimpleNamespace(bucket=lambda _bucket_name: fake_bucket)
    mock_logger = MagicMock()

    monkeypatch.setattr(module, "CORS_POLICY_PATH", artifact_path)
    monkeypatch.setattr(module, "_gcs_client", lambda: fake_client)
    monkeypatch.setattr(module, "logger", mock_logger)

    with pytest.raises(ValueError, match="bucket patch failed"):
        module.reconcile_storage_browser_upload_cors(
            actor_id="admin-user",
            settings=SimpleNamespace(gcs_user_storage_bucket="blockdata-user-content-dev"),
        )

    mock_logger.exception.assert_called_once()
    assert mock_logger.exception.call_args.kwargs["extra"] == {
        "action_id": "storage_browser_upload_cors_reconcile",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "failure",
        "error_type": "ValueError",
    }
