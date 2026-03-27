from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_superuser, require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app


def _mock_user_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="user@example.com",
    )


def _mock_superuser_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated", "platform_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def _reject_superuser():
    raise HTTPException(status_code=403, detail="Role required: platform_admin")


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_superuser] = _reject_superuser
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def superuser_client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_superuser] = _mock_superuser_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_supported_providers_returns_catalog(client):
    response = client.get("/agchain/models/providers")

    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert any(item["provider_slug"] == "openai" for item in body["items"])


def test_list_models_returns_rows_with_provider_metadata(client):
    rows = [
        {
            "model_target_id": "model-1",
            "label": "OpenAI GPT 5",
            "provider_slug": "openai",
            "provider_qualifier": None,
            "model_name": "gpt-5",
            "qualified_model": "openai/gpt-5",
            "api_base": "https://api.openai.com/v1",
            "auth_kind": "api_key",
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {"tools": True},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "healthy",
            "health_checked_at": "2026-03-26T12:00:00Z",
            "last_latency_ms": 250,
            "last_error_code": None,
            "last_error_message": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        }
    ]

    with patch("app.api.routes.agchain_models.list_model_targets") as mock_list:
        mock_list.return_value = [
            {
                "model_target_id": "model-1",
                "label": "OpenAI GPT 5",
                "provider_slug": "openai",
                "provider_display_name": "OpenAI",
                "provider_qualifier": None,
                "model_name": "gpt-5",
                "qualified_model": "openai/gpt-5",
                "api_base_display": "https://api.openai.com/v1",
                "auth_kind": "api_key",
                "credential_status": "ready",
                "enabled": True,
                "supports_evaluated": True,
                "supports_judge": False,
                "capabilities": {"tools": True},
                "health_status": "healthy",
                "health_checked_at": "2026-03-26T12:00:00Z",
                "last_latency_ms": 250,
                "probe_strategy": "provider_default",
                "notes": None,
                "created_at": "2026-03-26T12:00:00Z",
                "updated_at": "2026-03-26T12:00:00Z",
            }
        ]
        response = client.get("/agchain/models")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert body["items"][0]["provider_display_name"] == "OpenAI"


def test_get_model_returns_detail_and_recent_health_checks(client):
    row = {
        "model_target_id": "model-1",
        "label": "OpenAI GPT 5",
        "provider_slug": "openai",
        "provider_qualifier": None,
        "model_name": "gpt-5",
        "qualified_model": "openai/gpt-5",
        "api_base": "https://api.openai.com/v1",
        "auth_kind": "api_key",
        "credential_source_jsonb": {"provider": "user_api_keys"},
        "model_args_jsonb": {},
        "supports_evaluated": True,
        "supports_judge": False,
        "capabilities_jsonb": {"tools": True},
        "enabled": True,
        "probe_strategy": "provider_default",
        "health_status": "healthy",
        "health_checked_at": "2026-03-26T12:00:00Z",
        "last_latency_ms": 250,
        "last_error_code": None,
        "last_error_message": None,
        "notes": None,
        "created_at": "2026-03-26T12:00:00Z",
        "updated_at": "2026-03-26T12:00:00Z",
    }
    checks = [
        {
            "health_check_id": "check-1",
            "model_target_id": "model-1",
            "provider_slug": "openai",
            "probe_strategy": "provider_default",
            "status": "healthy",
            "latency_ms": 250,
            "error_code": None,
            "error_message": None,
            "checked_at": "2026-03-26T12:00:00Z",
            "metadata_jsonb": {},
        }
    ]

    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (row, checks)
        response = client.get("/agchain/models/model-1")

    assert response.status_code == 200
    body = response.json()
    assert body["model_target"]["model_target_id"] == "model-1"
    assert body["recent_health_checks"][0]["health_check_id"] == "check-1"


def test_get_model_returns_404_when_missing(client):
    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (None, [])
        response = client.get("/agchain/models/missing-model")

    assert response.status_code == 404


def test_create_model_requires_superuser(client):
    response = client.post(
        "/agchain/models",
        json={
            "label": "OpenAI GPT 5",
            "provider_slug": "openai",
            "provider_qualifier": None,
            "model_name": "gpt-5",
            "qualified_model": "openai/gpt-5",
            "auth_kind": "api_key",
            "credential_source_jsonb": {},
            "model_args_jsonb": {},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "probe_strategy": "provider_default",
            "notes": None,
            "enabled": True,
        },
    )

    assert response.status_code == 403


def test_create_model_creates_row_for_superuser(superuser_client):
    with patch("app.api.routes.agchain_models.create_model_target") as mock_create:
        mock_create.return_value = "model-1"
        response = superuser_client.post(
            "/agchain/models",
            json={
                "label": "OpenAI GPT 5",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-5",
                "qualified_model": "openai/gpt-5",
                "auth_kind": "api_key",
                "credential_source_jsonb": {},
                "model_args_jsonb": {},
                "supports_evaluated": True,
                "supports_judge": False,
                "capabilities_jsonb": {},
                "probe_strategy": "provider_default",
                "notes": None,
                "enabled": True,
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "model_target_id": "model-1"}


def test_patch_model_validates_provider_changes(superuser_client):
    with patch("app.api.routes.agchain_models.update_model_target") as mock_update:
        mock_update.return_value = "model-1"
        response = superuser_client.patch(
            "/agchain/models/model-1",
            json={"label": "Updated label", "enabled": False},
        )

    assert response.status_code == 200
    assert response.json()["model_target_id"] == "model-1"


def test_refresh_health_writes_history_and_updates_status(superuser_client):
    with patch("app.api.routes.agchain_models.refresh_model_target_health", new_callable=AsyncMock) as mock_refresh:
        mock_refresh.return_value = {
            "health_status": "healthy",
            "latency_ms": 123,
            "checked_at": "2026-03-26T12:00:00Z",
            "message": "probe ok",
            "probe_strategy": "http_openai_models",
        }
        response = superuser_client.post("/agchain/models/model-1/refresh-health")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "health_status": "healthy",
        "latency_ms": 123,
        "checked_at": "2026-03-26T12:00:00Z",
        "message": "probe ok",
        "probe_strategy": "http_openai_models",
    }
