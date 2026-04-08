from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_blockdata_admin, require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app

PROVIDER_MODEL_ID = "11111111-1111-1111-1111-111111111111"


def _mock_user_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="user@example.com",
    )


def _mock_blockdata_admin_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated", "blockdata_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def _reject_blockdata_admin():
    raise HTTPException(status_code=403, detail="Role required: blockdata_admin")


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_blockdata_admin] = _reject_blockdata_admin
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def blockdata_admin_client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_blockdata_admin] = _mock_blockdata_admin_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_admin_routes_reject_non_admin_user(client):
    assert client.get("/admin/ai-providers").status_code == 403
    assert client.get("/admin/ai-providers/models").status_code == 403


def test_list_provider_definitions_returns_registry_rows(blockdata_admin_client):
    with patch("app.api.routes.admin_ai_providers.list_provider_definitions") as mock_list:
        mock_list.return_value = [
            {
                "provider_slug": "openai",
                "display_name": "OpenAI",
                "provider_category": "model_provider",
                "credential_form_kind": "basic_api_key",
                "env_var_name": "OPENAI_API_KEY",
                "docs_url": "https://platform.openai.com/docs",
                "supported_auth_kinds": ["api_key"],
                "default_probe_strategy": "provider_default",
                "default_capabilities": {"text": True},
                "supports_custom_base_url": True,
                "supports_model_args": True,
                "enabled": True,
                "sort_order": 10,
                "notes": "OpenAI-compatible provider",
                "created_at": "2026-04-08T00:00:00Z",
                "updated_at": "2026-04-08T00:00:00Z",
            }
        ]

        response = blockdata_admin_client.get("/admin/ai-providers")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert "key_suffix" not in body["items"][0]
    assert "default_temperature" not in body["items"][0]


def test_list_provider_models_returns_paginated_envelope(blockdata_admin_client):
    with patch("app.api.routes.admin_ai_providers.list_provider_models") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "provider_model_id": PROVIDER_MODEL_ID,
                    "label": "GPT-5",
                    "provider_slug": "openai",
                    "provider_display_name": "OpenAI",
                    "model_id": "gpt-5",
                    "qualified_model": "openai/gpt-5",
                    "api_base_display": "https://api.openai.com/v1",
                    "auth_kind": "api_key",
                    "config_jsonb": {"supports_responses_api": True},
                    "capabilities_jsonb": {"tools": True},
                    "enabled": True,
                    "sort_order": 10,
                    "notes": "Primary OpenAI model",
                    "created_at": "2026-04-08T00:00:00Z",
                    "updated_at": "2026-04-08T00:00:00Z",
                }
            ],
            "total": 1,
            "limit": 50,
            "offset": 0,
        }

        response = blockdata_admin_client.get("/admin/ai-providers/models?provider_slug=openai")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert body["items"][0]["provider_display_name"] == "OpenAI"
    assert "credential_status" not in body["items"][0]
    assert "key_suffix" not in body["items"][0]
    assert body["total"] == 1
    mock_list.assert_called_once_with(
        provider_slug="openai",
        enabled=None,
        search=None,
        limit=50,
        offset=0,
    )


def test_list_provider_models_omits_null_filter_attrs_from_metrics(blockdata_admin_client):
    with (
        patch("app.api.routes.admin_ai_providers.list_provider_models") as mock_list,
        patch("app.api.routes.admin_ai_providers.provider_models_list_counter.add") as mock_counter_add,
        patch("app.api.routes.admin_ai_providers.provider_models_list_duration_ms.record") as mock_duration_record,
    ):
        mock_list.return_value = {
            "items": [],
            "total": 0,
            "limit": 50,
            "offset": 0,
        }

        response = blockdata_admin_client.get("/admin/ai-providers/models")

    assert response.status_code == 200
    counter_attrs = mock_counter_add.call_args.args[1]
    duration_attrs = mock_duration_record.call_args.args[1]
    assert counter_attrs["filter.provider_slug_present"] is False
    assert "enabled" not in counter_attrs
    assert "search" not in counter_attrs
    assert duration_attrs["filter.provider_slug_present"] is False


def test_create_provider_definition_creates_row_for_blockdata_admin(blockdata_admin_client):
    with patch("app.api.routes.admin_ai_providers.create_provider_definition") as mock_create:
        mock_create.return_value = "openrouter"

        response = blockdata_admin_client.post(
            "/admin/ai-providers",
            json={
                "provider_slug": "openrouter",
                "display_name": "OpenRouter",
                "provider_category": "model_provider",
                "credential_form_kind": "basic_api_key",
                "env_var_name": "OPENROUTER_API_KEY",
                "docs_url": "https://openrouter.ai/docs",
                "supported_auth_kinds": ["api_key"],
                "default_probe_strategy": "custom_http",
                "default_capabilities": {"text": True},
                "supports_custom_base_url": True,
                "supports_model_args": True,
                "enabled": True,
                "sort_order": 20,
                "notes": "Third-party aggregator",
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_slug": "openrouter"}


def test_patch_provider_definition_updates_row_for_blockdata_admin(blockdata_admin_client):
    with patch("app.api.routes.admin_ai_providers.update_provider_definition") as mock_update:
        mock_update.return_value = "openai"

        response = blockdata_admin_client.patch(
            "/admin/ai-providers/openai",
            json={
                "display_name": "OpenAI Platform",
                "enabled": False,
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_slug": "openai"}


def test_create_provider_model_creates_row_for_blockdata_admin(blockdata_admin_client):
    with patch("app.api.routes.admin_ai_providers.create_provider_model") as mock_create:
        mock_create.return_value = PROVIDER_MODEL_ID

        response = blockdata_admin_client.post(
            "/admin/ai-providers/models",
            json={
                "label": "Claude 3.7 Sonnet",
                "provider_slug": "anthropic",
                "model_id": "claude-3-7-sonnet",
                "qualified_model": "anthropic/claude-3-7-sonnet",
                "api_base": None,
                "auth_kind": "api_key",
                "config_jsonb": {"reasoning": "hybrid"},
                "capabilities_jsonb": {"tools": True},
                "enabled": True,
                "sort_order": 10,
                "notes": "Primary Anthropic model",
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_model_id": PROVIDER_MODEL_ID}


def test_patch_provider_model_updates_row_for_blockdata_admin(blockdata_admin_client):
    with patch("app.api.routes.admin_ai_providers.update_provider_model") as mock_update:
        mock_update.return_value = PROVIDER_MODEL_ID

        response = blockdata_admin_client.patch(
            f"/admin/ai-providers/models/{PROVIDER_MODEL_ID}",
            json={
                "label": "Claude 3.7 Sonnet v2",
                "enabled": False,
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_model_id": PROVIDER_MODEL_ID}
