from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
import httpx

from app.auth.dependencies import require_superuser, require_user_auth
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


@pytest.fixture
def unauthenticated_client():
    app = create_app()
    yield TestClient(app)


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
            ],
            "total": 1,
            "limit": 50,
            "offset": 0,
        }
        response = client.get("/agchain/models")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert body["items"][0]["provider_display_name"] == "OpenAI"
    assert body["total"] == 1


def test_list_models_returns_paginated_envelope(client):
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
            ],
            "total": 101,
            "limit": 50,
            "offset": 50,
        }

        response = client.get("/agchain/models?limit=50&offset=50")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert body["total"] == 101
    assert body["limit"] == 50
    assert body["offset"] == 50
    mock_list.assert_called_once_with(
        user_id="user-1",
        provider_slug=None,
        compatibility=None,
        health_status=None,
        enabled=None,
        search=None,
        limit=50,
        offset=50,
    )


def test_get_model_returns_detail_and_recent_health_checks(client):
    row = {
        "model_target_id": MODEL_ID,
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

    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (row, checks)
        response = client.get(f"/agchain/models/{MODEL_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["model_target"]["model_target_id"] == MODEL_ID
    assert body["recent_health_checks"][0]["health_check_id"] == "check-1"


def test_get_model_returns_404_when_missing(client):
    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (None, [])
        response = client.get(f"/agchain/models/{MISSING_MODEL_ID}")

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
            f"/agchain/models/{MODEL_ID}",
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
        response = superuser_client.post(f"/agchain/models/{MODEL_ID}/refresh-health")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "health_status": "healthy",
        "latency_ms": 123,
        "checked_at": "2026-03-26T12:00:00Z",
        "message": "probe ok",
        "probe_strategy": "http_openai_models",
    }


def test_connect_key_returns_masked_suffix_for_authenticated_user(client):
    with patch("app.api.routes.agchain_models.connect_model_key", create=True) as mock_connect:
        mock_connect.return_value = {
            "provider_slug": "openai",
            "key_suffix": "c123",
            "credential_status": "ready",
        }

        response = client.post(
            f"/agchain/models/{MODEL_ID}/connect-key",
            json={"api_key": "sk-test-abc123"},
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "key_suffix": "c123", "credential_status": "ready"}
    mock_connect.assert_called_once_with(user_id="user-1", model_target_id=MODEL_ID, api_key="sk-test-abc123")


def test_connect_key_rejects_unauthenticated(unauthenticated_client):
    response = unauthenticated_client.post(
        f"/agchain/models/{MODEL_ID}/connect-key",
        json={"api_key": "sk-test-abc123"},
    )

    assert response.status_code == 401


def test_connect_key_rejects_non_api_key_auth_kind(client):
    with patch(
        "app.api.routes.agchain_models.connect_model_key",
        create=True,
        side_effect=HTTPException(status_code=422, detail="Model target auth_kind is 'service_account', not 'api_key'"),
    ):
        response = client.post(
            f"/agchain/models/{MODEL_ID}/connect-key",
            json={"api_key": "sk-test-abc123"},
        )

    assert response.status_code == 422


def test_disconnect_key_returns_missing_for_authenticated_user(client):
    with patch("app.api.routes.agchain_models.disconnect_model_key", create=True) as mock_disconnect:
        mock_disconnect.return_value = {
            "provider_slug": "openai",
            "credential_status": "missing",
        }

        response = client.delete(f"/agchain/models/{MODEL_ID}/disconnect-key")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "credential_status": "missing"}
    mock_disconnect.assert_called_once_with(user_id="user-1", model_target_id=MODEL_ID)


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
        self._admin.calls.append((self._table_name, dict(self._filters)))
        if self._table_name == "agchain_model_targets":
            rows = [
                row for row in self._admin.model_rows
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            data = rows[0] if self._maybe_single else rows
            return type("R", (), {"data": data})()
        if self._table_name == "user_api_keys":
            rows = [
                row for row in self._admin.api_keys
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()
        if self._table_name == "user_provider_connections":
            rows = [
                row for row in self._admin.connections
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()
        if self._table_name == "agchain_model_health_checks":
            return type("R", (), {"data": []})()
        raise AssertionError(f"unexpected table {self._table_name}")


class _RegistryAdmin:
    def __init__(self, model_rows, api_keys, connections):
        self.model_rows = model_rows
        self.api_keys = api_keys
        self.connections = connections
        self.calls: list[tuple[str, dict[str, object]]] = []

    def table(self, name):
        return _RegistryQuery(self, name)


class _MutableRegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._maybe_single = False
        self._upsert_payload: dict[str, object] | None = None
        self._delete_mode = False

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

    def upsert(self, payload, **_kwargs):
        self._upsert_payload = payload
        return self

    def delete(self):
        self._delete_mode = True
        return self

    def execute(self):
        if self._table_name == "agchain_model_targets":
            rows = [
                row for row in self._admin.model_rows
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            data = rows[0] if self._maybe_single else rows
            return type("R", (), {"data": data})()

        if self._table_name == "user_api_keys":
            if self._upsert_payload is not None:
                payload = dict(self._upsert_payload)
                self._admin.api_keys = [
                    row
                    for row in self._admin.api_keys
                    if not (
                        row.get("user_id") == payload.get("user_id")
                        and row.get("provider") == payload.get("provider")
                    )
                ]
                self._admin.api_keys.append(payload)
                return type("R", (), {"data": [payload]})()

            if self._delete_mode:
                self._admin.api_keys = [
                    row
                    for row in self._admin.api_keys
                    if not all(row.get(key) == value for key, value in self._filters.items())
                ]
                return type("R", (), {"data": []})()

            rows = [
                row for row in self._admin.api_keys
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()

        if self._table_name == "user_provider_connections":
            rows = [
                row for row in self._admin.connections
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()

        if self._table_name == "agchain_model_health_checks":
            return type("R", (), {"data": []})()

        raise AssertionError(f"unexpected table {self._table_name}")


class _MutableRegistryAdmin:
    def __init__(self, model_rows, api_keys, connections):
        self.model_rows = model_rows
        self.api_keys = api_keys
        self.connections = connections

    def table(self, name):
        return _MutableRegistryQuery(self, name)


def test_list_model_targets_batches_credential_resolution_queries():
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
        {
            "model_target_id": "model-3",
            "label": "LocalAI Eval",
            "provider_slug": "localai",
            "provider_qualifier": None,
            "model_name": "llama",
            "qualified_model": "localai/llama",
            "api_base": "http://localhost:8080",
            "auth_kind": "connection",
            "credential_source_jsonb": {"source": "user_provider_connections", "connection_type": "openai_compatible"},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "degraded",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
        {
            "model_target_id": "model-4",
            "label": "Bedrock Judge",
            "provider_slug": "bedrock",
            "provider_qualifier": None,
            "model_name": "claude",
            "qualified_model": "bedrock/claude",
            "api_base": None,
            "auth_kind": "connection",
            "credential_source_jsonb": {"source": "user_provider_connections", "connection_type": "aws"},
            "supports_evaluated": False,
            "supports_judge": True,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "error",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
    ]
    admin = _RegistryAdmin(
        model_rows=model_rows,
        api_keys=[
            {"user_id": "user-1", "provider": "openai", "is_valid": True, "key_suffix": "c123"},
            {"user_id": "user-1", "provider": "anthropic", "is_valid": False},
        ],
        connections=[
            {"user_id": "user-1", "provider": "localai", "status": "connected", "connection_type": "openai_compatible"},
            {"user_id": "user-1", "provider": "bedrock", "status": "disconnected", "connection_type": "aws"},
        ],
    )

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {"display_name": slug.title(), "default_probe_strategy": "provider_default"},
        ),
    ):
        result = list_model_targets(user_id="user-1", limit=50, offset=0)

    assert result["total"] == 4
    assert result["limit"] == 50
    assert result["offset"] == 0
    assert [row["credential_status"] for row in result["items"]] == ["ready", "invalid", "ready", "disconnected"]
    assert result["items"][0]["key_suffix"] == "c123"
    assert "api_key" not in result["items"][0]
    assert "api_key_encrypted" not in result["items"][0]
    assert [call[0] for call in admin.calls].count("user_api_keys") == 1
    assert [call[0] for call in admin.calls].count("user_provider_connections") == 1


def test_load_model_detail_returns_requester_scoped_key_suffix_only():
    from app.domain.agchain.model_registry import load_model_detail

    admin = _RegistryAdmin(
        model_rows=[
            {
                "model_target_id": MODEL_ID,
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
            }
        ],
        api_keys=[
            {"user_id": "user-1", "provider": "openai", "is_valid": True, "key_suffix": "c123"},
        ],
        connections=[],
    )

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {"display_name": slug.title(), "default_probe_strategy": "provider_default"},
        ),
    ):
        model_target, recent_health_checks = load_model_detail(user_id="user-1", model_target_id=MODEL_ID)

    assert recent_health_checks == []
    assert model_target is not None
    assert model_target["credential_status"] == "ready"
    assert model_target["key_suffix"] == "c123"
    assert "api_key" not in model_target
    assert "api_key_encrypted" not in model_target


def test_connect_model_key_upserts_encrypted_api_key_with_updated_at():
    from app.domain.agchain.model_registry import connect_model_key

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin") as mock_get_sb,
        patch("app.domain.agchain.model_registry.encrypt_with_context", return_value="enc:v1:test"),
        patch("app.domain.agchain.model_registry.get_envelope_key", return_value="envelope-key"),
    ):
        mock_sb = mock_get_sb.return_value
        mock_sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "provider_slug": "openai",
            "auth_kind": "api_key",
        }
        mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [{"ok": True}]

        result = connect_model_key(user_id="user-1", model_target_id=MODEL_ID, api_key="sk-test-abc123")

    assert result == {"provider_slug": "openai", "key_suffix": "c123", "credential_status": "ready"}
    upsert_payload = mock_sb.table.return_value.upsert.call_args.args[0]
    assert upsert_payload["user_id"] == "user-1"
    assert upsert_payload["provider"] == "openai"
    assert upsert_payload["api_key_encrypted"] == "enc:v1:test"
    assert upsert_payload["key_suffix"] == "c123"
    assert upsert_payload["is_valid"] is None
    assert upsert_payload["updated_at"]
    assert mock_sb.table.return_value.upsert.call_args.kwargs["on_conflict"] == "user_id,provider"


def test_disconnect_model_key_scopes_delete_to_current_user_and_provider():
    from app.domain.agchain.model_registry import disconnect_model_key

    with patch("app.domain.agchain.model_registry.get_supabase_admin") as mock_get_sb:
        mock_sb = mock_get_sb.return_value
        mock_sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "provider_slug": "openai",
        }
        delete_chain = mock_sb.table.return_value.delete.return_value
        delete_chain.eq.return_value.eq.return_value.execute.return_value.data = []

        result = disconnect_model_key(user_id="user-1", model_target_id=MODEL_ID)

    assert result == {"provider_slug": "openai", "credential_status": "missing"}
    delete_chain.eq.assert_called_once_with("user_id", "user-1")
    delete_chain.eq.return_value.eq.assert_called_once_with("provider", "openai")


def test_provider_scoped_credentials_affect_all_targets_under_that_provider():
    from app.domain.agchain.model_registry import connect_model_key, disconnect_model_key

    admin = _MutableRegistryAdmin(
        model_rows=[
            {
                "model_target_id": "model-1",
                "label": "GPT-4.1 Mini",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-4.1-mini",
                "qualified_model": "openai/gpt-4.1-mini",
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
            {
                "model_target_id": "model-2",
                "label": "GPT-5.4 Default",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-5.4",
                "qualified_model": "openai/gpt-5.4",
                "api_base": None,
                "auth_kind": "api_key",
                "credential_source_jsonb": {},
                "supports_evaluated": True,
                "supports_judge": True,
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
        ],
        api_keys=[],
        connections=[],
    )

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.model_registry.encrypt_with_context", return_value="enc:v1:test"),
        patch("app.domain.agchain.model_registry.get_envelope_key", return_value="envelope-key"),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {"display_name": slug.title(), "default_probe_strategy": "provider_default"},
        ),
    ):
        connect_model_key(user_id="user-1", model_target_id="model-1", api_key="sk-test-abc123")
        connected = list_model_targets(user_id="user-1", limit=50, offset=0)
        disconnect_model_key(user_id="user-1", model_target_id="model-2")
        disconnected = list_model_targets(user_id="user-1", limit=50, offset=0)

    assert [row["credential_status"] for row in connected["items"]] == ["ready", "ready"]
    assert [row["key_suffix"] for row in connected["items"]] == ["c123", "c123"]
    assert [row["credential_status"] for row in disconnected["items"]] == ["missing", "missing"]


def test_get_model_rejects_invalid_model_target_id(client):
    with patch("app.api.routes.agchain_models.load_model_detail", side_effect=AssertionError("load should not be reached")):
        response = client.get("/agchain/models/not-a-uuid")

    assert response.status_code == 422


def test_patch_model_rejects_invalid_model_target_id(superuser_client):
    with patch("app.api.routes.agchain_models.update_model_target", side_effect=AssertionError("update should not be reached")):
        response = superuser_client.patch(
            "/agchain/models/not-a-uuid",
            json={"label": "Updated label"},
        )

    assert response.status_code == 422


def test_refresh_health_rejects_invalid_model_target_id(superuser_client):
    with patch(
        "app.api.routes.agchain_models.refresh_model_target_health",
        new_callable=AsyncMock,
        side_effect=AssertionError("refresh should not be reached"),
    ):
        response = superuser_client.post("/agchain/models/not-a-uuid/refresh-health")

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_run_provider_probe_hides_internal_exception_detail(monkeypatch):
    from app.domain.agchain.model_registry import _run_provider_probe

    class _BoomAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *_args, **_kwargs):
            raise httpx.ConnectError("http://10.0.0.4:11434 exploded")

    monkeypatch.setattr("app.domain.agchain.model_registry.httpx.AsyncClient", lambda **_kwargs: _BoomAsyncClient())

    result = await _run_provider_probe(
        sb=None,
        row={
            "provider_slug": "openai",
            "auth_kind": "none",
            "api_base": "http://127.0.0.1:11434",
            "probe_strategy": "http_openai_models",
        },
        provider_definition={"default_probe_strategy": "http_openai_models"},
        user_id="user-1",
        credential_status="ready",
    )

    assert result["health_status"] == "error"
    assert result["message"] == "ConnectError: probe failed"


def test_load_api_key_uses_decrypt_with_fallback():
    from app.domain.agchain.model_registry import _load_api_key

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"api_key_encrypted": "enc:v1:test"}
    ]

    with patch(
        "app.domain.agchain.model_registry.decrypt_with_fallback",
        return_value="sk-live-test",
    ) as mock_fallback:
        result = _load_api_key(mock_sb, user_id="user-1", provider_slug="openai")

    assert result == "sk-live-test"
    mock_fallback.assert_called_once_with("enc:v1:test", "user-api-keys-v1")
