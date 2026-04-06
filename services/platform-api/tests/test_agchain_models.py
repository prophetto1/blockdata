from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_agchain_admin, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.model_registry import list_model_targets
from app.main import create_app

MODEL_ID = "11111111-1111-1111-1111-111111111111"
MISSING_MODEL_ID = "22222222-2222-2222-2222-222222222222"


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


@pytest.fixture
def unauthenticated_client():
    app = create_app()
    yield TestClient(app)


def test_admin_routes_reject_non_admin_user(client):
    assert client.get("/agchain/models/providers").status_code == 403
    assert client.get("/agchain/models").status_code == 403
    assert client.get(f"/agchain/models/{MODEL_ID}").status_code == 403


def test_list_supported_providers_returns_persisted_registry_rows(agchain_admin_client):
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


def test_list_models_returns_registry_only_rows_for_admin(agchain_admin_client):
    with patch("app.api.routes.agchain_models.list_model_targets") as mock_list:
        mock_list.return_value = {
            "items": [
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
            ],
            "total": 1,
            "limit": 50,
            "offset": 0,
        }
        response = agchain_admin_client.get("/agchain/models")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert "credential_status" not in body["items"][0]
    assert body["total"] == 1


def test_list_models_returns_paginated_envelope(agchain_admin_client):
    with patch("app.api.routes.agchain_models.list_model_targets") as mock_list:
        mock_list.return_value = {
            "items": [],
            "total": 101,
            "limit": 50,
            "offset": 50,
        }
        response = agchain_admin_client.get("/agchain/models?limit=50&offset=50")

    assert response.status_code == 200
    assert response.json()["total"] == 101
    mock_list.assert_called_once_with(
        provider_slug=None,
        compatibility=None,
        health_status=None,
        enabled=None,
        search=None,
        limit=50,
        offset=50,
    )


def test_list_models_omits_null_filter_attrs_from_metrics(agchain_admin_client):
    with (
        patch("app.api.routes.agchain_models.list_model_targets") as mock_list,
        patch("app.api.routes.agchain_models.models_list_counter.add") as mock_counter_add,
        patch("app.api.routes.agchain_models.models_list_duration_ms.record") as mock_duration_record,
    ):
        mock_list.return_value = {
            "items": [],
            "total": 0,
            "limit": 50,
            "offset": 0,
        }
        response = agchain_admin_client.get("/agchain/models")

    assert response.status_code == 200
    counter_attrs = mock_counter_add.call_args.args[1]
    duration_attrs = mock_duration_record.call_args.args[1]
    assert counter_attrs["filter.provider_slug_present"] is False
    assert "filter.compatibility" not in counter_attrs
    assert "filter.health_status" not in counter_attrs
    assert duration_attrs["filter.provider_slug_present"] is False


def test_get_model_returns_detail_and_recent_health_checks(agchain_admin_client):
    row = {
        "model_target_id": MODEL_ID,
        "label": "OpenAI GPT 5",
        "provider_slug": "openai",
        "provider_display_name": "OpenAI",
        "provider_qualifier": None,
        "model_name": "gpt-5",
        "qualified_model": "openai/gpt-5",
        "api_base_display": "https://api.openai.com/v1",
        "auth_kind": "api_key",
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
    checks = [
        {
            "health_check_id": "check-1",
            "model_target_id": MODEL_ID,
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
    provider_definition = {
        "provider_slug": "openai",
        "display_name": "OpenAI",
        "provider_category": "model_provider",
        "credential_form_kind": "basic_api_key",
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"text": True},
        "supports_custom_base_url": True,
        "supports_model_args": True,
        "enabled": True,
        "sort_order": 10,
        "notes": "OpenAI-compatible provider family",
    }

    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (row, checks, provider_definition)
        response = agchain_admin_client.get(f"/agchain/models/{MODEL_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["model_target"]["model_target_id"] == MODEL_ID
    assert body["recent_health_checks"][0]["health_check_id"] == "check-1"
    assert body["provider_definition"]["provider_slug"] == "openai"


def test_get_model_returns_404_when_missing(agchain_admin_client):
    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (None, [], None)
        response = agchain_admin_client.get(f"/agchain/models/{MISSING_MODEL_ID}")

    assert response.status_code == 404


def test_create_model_creates_row_for_agchain_admin(agchain_admin_client):
    with patch("app.api.routes.agchain_models.create_model_target") as mock_create:
        mock_create.return_value = "model-1"
        response = agchain_admin_client.post(
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


def test_patch_model_updates_row_for_agchain_admin(agchain_admin_client):
    with patch("app.api.routes.agchain_models.update_model_target") as mock_update:
        mock_update.return_value = "model-1"
        response = agchain_admin_client.patch(
            f"/agchain/models/{MODEL_ID}",
            json={"label": "Updated label", "enabled": False},
        )

    assert response.status_code == 200
    assert response.json()["model_target_id"] == "model-1"


class _RegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._maybe_single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self._filters[key] = value
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self._table_name == "agchain_model_targets":
            rows = [
                row for row in self._admin.model_rows
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            data = rows[0] if self._maybe_single else rows
            return type("R", (), {"data": data})()
        if self._table_name == "agchain_model_health_checks":
            return type("R", (), {"data": []})()
        raise AssertionError(f"unexpected table {self._table_name}")


class _RegistryAdmin:
    def __init__(self, model_rows):
        self.model_rows = model_rows

    def table(self, name):
        return _RegistryQuery(self, name)


def test_list_model_targets_reads_registry_only_rows():
    model_rows = [
        {
            "model_target_id": "model-1",
            "label": "OpenAI GPT 5",
            "provider_slug": "openai",
            "provider_qualifier": None,
            "model_name": "gpt-5",
            "qualified_model": "openai/gpt-5",
            "api_base": "https://api.openai.com/v1",
            "auth_kind": "api_key",
            "credential_source_jsonb": {},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "healthy",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
        {
            "model_target_id": "model-2",
            "label": "Anthropic Claude",
            "provider_slug": "anthropic",
            "provider_qualifier": None,
            "model_name": "claude-3-7",
            "qualified_model": "anthropic/claude-3-7",
            "api_base": None,
            "auth_kind": "api_key",
            "credential_source_jsonb": {},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "healthy",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
    ]
    admin = _RegistryAdmin(model_rows=model_rows)

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {
                "display_name": slug.title(),
                "supported_auth_kinds": ["api_key"],
            },
        ),
    ):
        result = list_model_targets(limit=50, offset=0)

    assert result["total"] == 2
    assert result["items"][0]["provider_display_name"] == "Openai"
    assert "credential_status" not in result["items"][0]


def test_get_model_rejects_invalid_model_target_id(agchain_admin_client):
    response = agchain_admin_client.get("/agchain/models/not-a-uuid")
    assert response.status_code == 422


def test_get_model_requires_auth(unauthenticated_client):
    response = unauthenticated_client.get(f"/agchain/models/{MODEL_ID}")
    assert response.status_code == 401
