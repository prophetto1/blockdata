from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_agchain_admin, require_user_auth
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


def _mock_agchain_admin_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated", "agchain_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def _reject_agchain_admin():
    raise HTTPException(status_code=403, detail="Role required: agchain_admin")


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_agchain_admin] = _reject_agchain_admin
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def agchain_admin_client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_agchain_admin] = _mock_agchain_admin_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_organization_model_providers_returns_scoped_rows(client):
    with patch(
        "app.api.routes.agchain_organization_model_providers.list_organization_model_providers"
    ) as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "provider_slug": "openai",
                    "display_name": "OpenAI",
                    "provider_category": "model_provider",
                    "credential_form_kind": "basic_api_key",
                    "env_var_name": "OPENAI_API_KEY",
                    "docs_url": "https://platform.openai.com/docs/api-reference",
                    "supported_auth_kinds": ["api_key"],
                    "enabled": True,
                    "credential_status": "set",
                    "effective_source": "organization",
                    "last_updated_at": "2026-04-06T12:00:00Z",
                    "has_local_override": False,
                    "notes": "OpenAI-compatible provider family",
                }
            ]
        }

        response = client.get("/agchain/organizations/org-1/model-providers")

    assert response.status_code == 200
    assert response.json()["items"][0]["credential_status"] == "set"
    mock_list.assert_called_once_with(user_id="user-1", organization_id="org-1")


def test_put_organization_model_provider_credential_saves_payload(client):
    payload = {"credential_payload": {"api_key": "sk-test-abc123"}}

    with patch(
        "app.api.routes.agchain_organization_model_providers.upsert_organization_model_provider_credential"
    ) as mock_upsert:
        mock_upsert.return_value = {
            "provider_slug": "openai",
            "credential_status": "set",
        }

        response = client.put(
            "/agchain/organizations/org-1/model-providers/openai/credential",
            json=payload,
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_slug": "openai", "credential_status": "set"}
    mock_upsert.assert_called_once_with(
        user_id="user-1",
        organization_id="org-1",
        provider_slug="openai",
        credential_payload={"api_key": "sk-test-abc123"},
    )


def test_test_organization_model_provider_credential_returns_probe_result(client):
    payload = {"credential_payload": {"api_key": "sk-test-abc123"}}

    with patch(
        "app.api.routes.agchain_organization_model_providers.test_organization_model_provider_credential",
        new_callable=AsyncMock,
    ) as mock_test:
        mock_test.return_value = {
            "provider_slug": "openai",
            "result": "success",
            "message": "Credential validated successfully.",
        }

        response = client.post(
            "/agchain/organizations/org-1/model-providers/openai/credential/test",
            json=payload,
        )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "provider_slug": "openai",
        "result": "success",
        "message": "Credential validated successfully.",
    }


def test_delete_organization_model_provider_credential_clears_provider(client):
    with patch(
        "app.api.routes.agchain_organization_model_providers.delete_organization_model_provider_credential"
    ) as mock_delete:
        mock_delete.return_value = {
            "provider_slug": "openai",
            "credential_status": "not_set",
        }

        response = client.delete("/agchain/organizations/org-1/model-providers/openai/credential")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_slug": "openai", "credential_status": "not_set"}


def test_list_project_model_providers_returns_effective_inherited_status(client):
    with patch(
        "app.api.routes.agchain_project_model_providers.list_project_model_providers"
    ) as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "provider_slug": "anthropic",
                    "display_name": "Anthropic",
                    "provider_category": "model_provider",
                    "credential_form_kind": "basic_api_key",
                    "env_var_name": "ANTHROPIC_API_KEY",
                    "docs_url": "https://docs.anthropic.com/en/api/getting-started",
                    "supported_auth_kinds": ["api_key"],
                    "enabled": True,
                    "credential_status": "inherited",
                    "effective_source": "organization",
                    "last_updated_at": "2026-04-06T12:00:00Z",
                    "has_local_override": False,
                    "notes": "Anthropic provider family",
                }
            ]
        }

        response = client.get("/agchain/projects/project-1/model-providers")

    assert response.status_code == 200
    assert response.json()["items"][0]["credential_status"] == "inherited"
    mock_list.assert_called_once_with(user_id="user-1", project_id="project-1")


def test_put_project_model_provider_credential_saves_override(client):
    payload = {"credential_payload": {"api_key": "sk-live-xyz987"}}

    with patch(
        "app.api.routes.agchain_project_model_providers.upsert_project_model_provider_credential"
    ) as mock_upsert:
        mock_upsert.return_value = {
            "provider_slug": "openai",
            "credential_status": "set",
        }

        response = client.put(
            "/agchain/projects/project-1/model-providers/openai/credential",
            json=payload,
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_slug": "openai", "credential_status": "set"}


def test_delete_project_model_provider_credential_returns_inherited_when_org_default_exists(client):
    with patch(
        "app.api.routes.agchain_project_model_providers.delete_project_model_provider_credential"
    ) as mock_delete:
        mock_delete.return_value = {
            "provider_slug": "openai",
            "credential_status": "inherited",
        }

        response = client.delete("/agchain/projects/project-1/model-providers/openai/credential")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider_slug": "openai", "credential_status": "inherited"}


def test_test_project_model_provider_credential_returns_probe_result(client):
    payload = {
        "credential_payload": {
            "provider_mode": "standard",
            "auth_mode": "access_token",
            "access_token": "token-value",
            "project": "acme-vertex",
            "location": "us-central1",
        }
    }

    with patch(
        "app.api.routes.agchain_project_model_providers.test_project_model_provider_credential",
        new_callable=AsyncMock,
    ) as mock_test:
        mock_test.return_value = {
            "provider_slug": "vertex-ai",
            "result": "success",
            "message": "Credential validated successfully.",
        }

        response = client.post(
            "/agchain/projects/project-1/model-providers/vertex-ai/credential/test",
            json=payload,
        )

    assert response.status_code == 200
    assert response.json()["result"] == "success"


def test_admin_provider_registry_routes_require_agchain_admin(client):
    response = client.get("/agchain/models/providers")
    assert response.status_code == 403


def test_admin_provider_registry_routes_return_persisted_rows(agchain_admin_client):
    with patch("app.api.routes.agchain_models.list_supported_providers") as mock_list:
        mock_list.return_value = [
            {
                "provider_slug": "openai",
                "display_name": "OpenAI",
                "provider_category": "model_provider",
                "credential_form_kind": "basic_api_key",
                "env_var_name": "OPENAI_API_KEY",
                "docs_url": "https://platform.openai.com/docs/api-reference",
                "supported_auth_kinds": ["api_key"],
                "default_probe_strategy": "http_openai_models",
                "default_capabilities": {"text": True},
                "supports_custom_base_url": True,
                "supports_model_args": True,
                "enabled": True,
                "sort_order": 10,
                "notes": "OpenAI-compatible provider family",
            }
        ]

        response = agchain_admin_client.get("/agchain/models/providers")

    assert response.status_code == 200
    assert response.json()["items"][0]["provider_slug"] == "openai"


def test_admin_provider_registry_create_and_update_routes(agchain_admin_client):
    create_payload = {
        "provider_slug": "vertex-ai",
        "display_name": "Vertex AI",
        "provider_category": "cloud_provider",
        "credential_form_kind": "vertex_ai",
        "env_var_name": "GOOGLE_APPLICATION_CREDENTIALS",
        "docs_url": "https://cloud.google.com/vertex-ai/docs",
        "supported_auth_kinds": ["service_account", "api_key"],
        "default_probe_strategy": "http_google_models",
        "default_capabilities": {"text": True},
        "supports_custom_base_url": False,
        "supports_model_args": True,
        "enabled": True,
        "sort_order": 30,
        "notes": "Vertex AI provider family",
    }

    with (
        patch("app.api.routes.agchain_models.create_provider_definition") as mock_create,
        patch("app.api.routes.agchain_models.update_provider_definition") as mock_update,
    ):
        mock_create.return_value = "vertex-ai"
        mock_update.return_value = "vertex-ai"

        create_response = agchain_admin_client.post("/agchain/models/providers", json=create_payload)
        update_response = agchain_admin_client.patch(
            "/agchain/models/providers/vertex-ai",
            json={"display_name": "Vertex AI Global", "enabled": False},
        )

    assert create_response.status_code == 200
    assert create_response.json() == {"ok": True, "provider_slug": "vertex-ai"}
    assert update_response.status_code == 200
    assert update_response.json() == {"ok": True, "provider_slug": "vertex-ai"}
