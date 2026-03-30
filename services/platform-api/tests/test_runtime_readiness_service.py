from __future__ import annotations

from types import SimpleNamespace

from app.services.runtime_readiness import (
    check_blockdata_storage_bucket_cors,
    check_blockdata_storage_signed_url_signing,
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
