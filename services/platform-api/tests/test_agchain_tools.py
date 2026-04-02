from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app

PROJECT_ID = "project-1"
TOOL_ID = "11111111-1111-1111-1111-111111111111"
TOOL_VERSION_ID = "22222222-2222-2222-2222-222222222222"


def _mock_user_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="user@example.com",
    )


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_tools_route_returns_merged_registry_rows(client):
    with patch("app.api.routes.agchain_tools.list_tools") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "tool_ref": "custom:tool-version-1",
                    "tool_id": TOOL_ID,
                    "tool_name": "custom_lookup",
                    "display_name": "Custom Lookup",
                    "description": "Project tool.",
                    "source_kind": "custom",
                    "scope_kind": "project",
                    "read_only": False,
                    "approval_mode": "manual",
                    "latest_version": {"tool_version_id": "tool-version-1", "version_label": "v1"},
                    "updated_at": "2026-04-01T08:00:00Z",
                },
            ],
            "next_cursor": None,
        }

        response = client.get(
            "/agchain/tools",
            params={"project_id": PROJECT_ID, "source_kind": "custom", "include_archived": False},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["tool_ref"] == "custom:tool-version-1"
    mock_list.assert_called_once_with(
        user_id="user-1",
        project_id=PROJECT_ID,
        source_kind="custom",
        include_archived=False,
        cursor=None,
    )


def test_tools_bootstrap_route_returns_editor_defaults(client):
    with patch("app.api.routes.agchain_tools.get_tools_bootstrap") as mock_bootstrap:
        mock_bootstrap.return_value = {
            "builtin_catalog": [{"tool_ref": "builtin:web_search", "display_name": "Web Search"}],
            "sandbox_profiles": [{"sandbox_profile_id": "sandbox-1", "profile_name": "Default"}],
            "source_kind_options": ["custom", "bridged", "mcp_server"],
            "secret_slot_contract": {"value_kinds": ["token", "api_key"]},
        }

        response = client.get("/agchain/tools/new/bootstrap", params={"project_id": PROJECT_ID})

    assert response.status_code == 200
    body = response.json()
    assert body["builtin_catalog"][0]["tool_ref"] == "builtin:web_search"
    assert body["source_kind_options"] == ["custom", "bridged", "mcp_server"]
    mock_bootstrap.assert_called_once_with(user_id="user-1", project_id=PROJECT_ID)


def test_preview_tool_route_returns_validation_and_discovered_tools(client):
    with patch("app.api.routes.agchain_tools.preview_tool_definition") as mock_preview:
        mock_preview.return_value = {
            "normalized_definition": {
                "source_kind": "mcp_server",
                "tool_config_jsonb": {"transport_type": "stdio", "command": "demo-mcp"},
            },
            "discovered_tools": [
                {
                    "server_tool_name": "list_files",
                    "display_name": "List Files",
                    "description": "List files from the server.",
                    "input_schema_jsonb": {"type": "object"},
                    "preview_tool_ref": "list_files",
                }
            ],
            "validation": {"ok": True, "errors": [], "warnings": []},
            "missing_secret_slots": [],
        }

        response = client.post(
            "/agchain/tools/new/preview",
            json={
                "project_id": PROJECT_ID,
                "source_kind": "mcp_server",
                "draft": {"tool_config_jsonb": {"transport_type": "stdio", "command": "demo-mcp"}},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["validation"]["ok"] is True
    assert body["discovered_tools"][0]["server_tool_name"] == "list_files"
    mock_preview.assert_called_once_with(
        user_id="user-1",
        project_id=PROJECT_ID,
        source_kind="mcp_server",
        draft={"tool_config_jsonb": {"transport_type": "stdio", "command": "demo-mcp"}},
    )


def test_get_tool_detail_route_returns_versions_for_project_tool(client):
    with patch("app.api.routes.agchain_tools.get_tool_detail") as mock_detail:
        mock_detail.return_value = {
            "tool": {
                "tool_id": TOOL_ID,
                "tool_ref": "custom:tool-version-1",
                "tool_name": "custom_lookup",
                "display_name": "Custom Lookup",
                "description": "Project tool.",
                "source_kind": "custom",
                "approval_mode": "manual",
            },
            "latest_version": {"tool_version_id": "tool-version-1", "version_label": "v1"},
            "versions": [{"tool_version_id": "tool-version-1", "version_label": "v1", "status": "published"}],
        }

        response = client.get(f"/agchain/tools/{TOOL_ID}/detail", params={"project_id": PROJECT_ID})

    assert response.status_code == 200
    body = response.json()
    assert body["tool"]["tool_id"] == TOOL_ID
    assert body["latest_version"]["tool_version_id"] == "tool-version-1"
    mock_detail.assert_called_once_with(user_id="user-1", project_id=PROJECT_ID, tool_id=TOOL_ID)


def test_create_tool_route_returns_tool_and_initial_version(client):
    with patch("app.api.routes.agchain_tools.create_tool") as mock_create:
        mock_create.return_value = {
            "tool": {"tool_id": TOOL_ID, "tool_name": "custom_lookup"},
            "latest_version": {"tool_version_id": TOOL_VERSION_ID, "version_label": "v1"},
            "versions": [{"tool_version_id": TOOL_VERSION_ID, "version_label": "v1"}],
        }

        response = client.post(
            "/agchain/tools",
            json={
                "project_id": PROJECT_ID,
                "tool": {
                    "tool_name": "custom_lookup",
                    "display_name": "Custom Lookup",
                    "description": "Project tool.",
                    "approval_mode": "manual",
                },
                "initial_version": {
                    "version_label": "v1",
                    "input_schema_jsonb": {},
                    "output_schema_jsonb": {},
                    "tool_config_jsonb": {"implementation_ref": "pkg.tool"},
                    "parallel_calls_allowed": False,
                    "status": "draft",
                },
            },
        )

    assert response.status_code == 200
    assert response.json()["tool"]["tool_id"] == TOOL_ID
    mock_create.assert_called_once()


def test_update_tool_route_returns_updated_tool(client):
    with patch("app.api.routes.agchain_tools.update_tool") as mock_update:
        mock_update.return_value = {
            "tool": {
                "tool_id": TOOL_ID,
                "display_name": "Custom Lookup",
                "description": "Updated description.",
                "approval_mode": "manual",
            }
        }

        response = client.patch(
            f"/agchain/tools/{TOOL_ID}",
            json={
                "project_id": PROJECT_ID,
                "display_name": "Custom Lookup",
                "description": "Updated description.",
                "approval_mode": "manual",
                "sandbox_requirement_jsonb": {},
            },
        )

    assert response.status_code == 200
    assert response.json()["tool"]["description"] == "Updated description."
    mock_update.assert_called_once()


def test_create_tool_version_route_returns_tool_version(client):
    with patch("app.api.routes.agchain_tools.create_tool_version") as mock_create_version:
        mock_create_version.return_value = {
            "tool_version": {"tool_version_id": TOOL_VERSION_ID, "version_label": "v2", "status": "draft"}
        }

        response = client.post(
            f"/agchain/tools/{TOOL_ID}/versions",
            json={
                "project_id": PROJECT_ID,
                "version_label": "v2",
                "input_schema_jsonb": {},
                "output_schema_jsonb": {},
                "tool_config_jsonb": {"implementation_ref": "pkg.tool"},
                "parallel_calls_allowed": False,
                "status": "draft",
            },
        )

    assert response.status_code == 200
    assert response.json()["tool_version"]["tool_version_id"] == TOOL_VERSION_ID
    mock_create_version.assert_called_once()


def test_update_tool_version_route_returns_tool_version(client):
    with patch("app.api.routes.agchain_tools.update_tool_version") as mock_update_version:
        mock_update_version.return_value = {
            "tool_version": {"tool_version_id": TOOL_VERSION_ID, "version_label": "v2", "status": "draft"}
        }

        response = client.patch(
            f"/agchain/tools/{TOOL_ID}/versions/{TOOL_VERSION_ID}",
            json={
                "project_id": PROJECT_ID,
                "tool_config_jsonb": {"implementation_ref": "pkg.tool.v2"},
            },
        )

    assert response.status_code == 200
    assert response.json()["tool_version"]["tool_version_id"] == TOOL_VERSION_ID
    mock_update_version.assert_called_once()


def test_publish_tool_version_route_returns_ok(client):
    with patch("app.api.routes.agchain_tools.publish_tool_version") as mock_publish:
        mock_publish.return_value = {
            "tool": {"tool_id": TOOL_ID},
            "tool_version": {"tool_version_id": TOOL_VERSION_ID, "status": "published"},
        }

        response = client.post(
            f"/agchain/tools/{TOOL_ID}/versions/{TOOL_VERSION_ID}/publish",
            json={"project_id": PROJECT_ID},
        )

    assert response.status_code == 200
    assert response.json()["tool_version"]["status"] == "published"
    mock_publish.assert_called_once()


def test_archive_tool_route_returns_ok(client):
    with patch("app.api.routes.agchain_tools.archive_tool") as mock_archive:
        mock_archive.return_value = {"tool": {"tool_id": TOOL_ID, "archived_at": "2026-04-01T08:30:00Z"}}

        response = client.post(f"/agchain/tools/{TOOL_ID}/archive", json={"project_id": PROJECT_ID})

    assert response.status_code == 200
    assert response.json()["tool"]["archived_at"] == "2026-04-01T08:30:00Z"
    mock_archive.assert_called_once()


class _ToolsRegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._operation = "select"
        self._maybe_single = False
        self._order_key: str | None = None
        self._order_desc = False
        self._payload = None

    def select(self, *_args, **_kwargs):
        self._operation = "select"
        return self

    def eq(self, key: str, value: object):
        self._filters[key] = value
        return self

    def order(self, key: str, *, desc: bool = False):
        self._order_key = key
        self._order_desc = desc
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def insert(self, payload):
        self._operation = "insert"
        self._payload = payload
        return self

    def update(self, payload):
        self._operation = "update"
        self._payload = payload
        return self

    def execute(self):
        if self._operation == "insert":
            payload = dict(self._payload or {})
            identity_field = self._admin.identity_fields.get(self._table_name)
            if identity_field and identity_field not in payload:
                payload[identity_field] = self._admin.generated_ids.get(self._table_name, f"{self._table_name}-1")
            self._admin.tables.setdefault(self._table_name, []).append(payload)
            self._admin.insert_calls.append((self._table_name, payload))
            return type("R", (), {"data": [dict(payload)]})()

        if self._operation == "update":
            updated = []
            for row in self._admin.tables.get(self._table_name, []):
                if all(row.get(key) == value for key, value in self._filters.items()):
                    row.update(dict(self._payload or {}))
                    updated.append(dict(row))
            self._admin.update_calls.append((self._table_name, dict(self._payload or {}), dict(self._filters)))
            return type("R", (), {"data": updated})()

        rows = list(self._admin.tables.get(self._table_name, []))
        rows = [row for row in rows if all(row.get(key) == value for key, value in self._filters.items())]
        if self._order_key is not None:
            rows.sort(key=lambda row: row.get(self._order_key) or "", reverse=self._order_desc)
        data = rows[0] if self._maybe_single and rows else (None if self._maybe_single else rows)
        return type("R", (), {"data": data})()


class _ToolsRegistryAdmin:
    def __init__(self, *, tables=None):
        self.tables = tables or {}
        self.generated_ids = {
            "agchain_tools": TOOL_ID,
            "agchain_tool_versions": TOOL_VERSION_ID,
        }
        self.identity_fields = {
            "agchain_tools": "tool_id",
            "agchain_tool_versions": "tool_version_id",
        }
        self.insert_calls: list[tuple[str, dict[str, object]]] = []
        self.update_calls: list[tuple[str, dict[str, object], dict[str, object]]] = []

    def table(self, name: str):
        return _ToolsRegistryQuery(self, name)


def test_list_tools_merges_builtin_catalog_with_project_rows():
    from app.domain.agchain.tool_registry import list_tools

    admin = _ToolsRegistryAdmin(
        tables={
            "agchain_tools": [
                {
                    "tool_id": TOOL_ID,
                    "project_id": PROJECT_ID,
                    "tool_name": "custom_lookup",
                    "display_name": "Custom Lookup",
                    "description": "Project tool.",
                    "source_kind": "custom",
                    "approval_mode": "manual",
                    "latest_version_id": "tool-version-1",
                    "archived_at": None,
                    "updated_at": "2026-04-01T08:00:00Z",
                }
            ],
            "agchain_tool_versions": [
                {
                    "tool_version_id": "tool-version-1",
                    "tool_id": TOOL_ID,
                    "version_label": "v1",
                    "status": "published",
                    "created_at": "2026-04-01T08:00:00Z",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.tool_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.tool_registry.require_project_access",
            return_value={"project_id": PROJECT_ID, "membership_role": "project_viewer"},
        ),
        patch(
            "app.domain.agchain.tool_registry.list_builtin_tools",
            return_value=[
                {
                    "tool_ref": "builtin:web_search",
                    "tool_name": "web_search",
                    "display_name": "Web Search",
                    "description": "Search the web.",
                    "approval_mode": "auto",
                }
            ],
        ),
    ):
        payload = list_tools(
            user_id="user-1",
            project_id=PROJECT_ID,
            source_kind=None,
            include_archived=False,
            cursor=None,
        )

    assert [item["tool_ref"] for item in payload["items"]] == ["builtin:web_search", "custom:tool-version-1"]
    assert payload["items"][0]["read_only"] is True
    assert payload["items"][0]["scope_kind"] == "system"
    assert payload["items"][1]["tool_id"] == TOOL_ID
    assert payload["items"][1]["scope_kind"] == "project"


def test_create_tool_persists_tool_and_initial_version_for_project_editor():
    from app.domain.agchain.tool_registry import create_tool

    admin = _ToolsRegistryAdmin(tables={"agchain_tools": [], "agchain_tool_versions": []})

    with (
        patch("app.domain.agchain.tool_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.tool_registry.require_project_write_access",
            return_value={"project_id": PROJECT_ID, "membership_role": "project_editor"},
        ),
    ):
        payload = create_tool(
            user_id="user-1",
            project_id=PROJECT_ID,
            tool={
                "tool_name": "custom_lookup",
                "display_name": "Custom Lookup",
                "description": "Project tool.",
                "approval_mode": "manual",
            },
            initial_version={
                "version_label": "v1",
                "input_schema_jsonb": {},
                "output_schema_jsonb": {},
                "tool_config_jsonb": {"implementation_ref": "pkg.tool"},
                "parallel_calls_allowed": False,
                "status": "draft",
            },
        )

    assert payload["tool"]["tool_id"] == TOOL_ID
    assert payload["latest_version"]["tool_version_id"] == TOOL_VERSION_ID
    assert [table for table, _ in admin.insert_calls] == ["agchain_tools", "agchain_tool_versions"]


def test_preview_custom_tool_definition_returns_structural_validation():
    from app.domain.agchain.tool_resolution import preview_tool_definition

    admin = _ToolsRegistryAdmin(
        tables={
            "user_variables": [
                {
                    "id": "secret-1",
                    "user_id": "user-1",
                    "name": "OPENAI_API_KEY",
                    "value_kind": "api_key",
                    "created_at": "2026-04-01T08:00:00Z",
                    "updated_at": "2026-04-01T08:00:00Z",
                }
            ]
        }
    )

    with (
        patch("app.domain.agchain.tool_resolution.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.tool_resolution.require_project_write_access",
            return_value={"project_id": PROJECT_ID, "membership_role": "project_editor"},
        ),
    ):
        payload = preview_tool_definition(
            user_id="user-1",
            project_id=PROJECT_ID,
            source_kind="custom",
            draft={
                "version_label": "v1",
                "tool_config_jsonb": {
                    "implementation_kind": "python_callable",
                    "implementation_ref": "pkg.tools.custom_lookup",
                    "secret_slots": [
                        {
                            "slot_key": "openai_api_key",
                            "value_kind": "api_key",
                            "required": True,
                            "description": "OpenAI key",
                            "default_secret_name_hint": "OPENAI_API_KEY",
                        }
                    ],
                },
            },
        )

    assert payload["validation"]["ok"] is True
    assert payload["validation"]["errors"] == []
    assert payload["discovered_tools"] == []
    assert payload["missing_secret_slots"] == []
    assert payload["normalized_definition"]["tool_config_jsonb"]["implementation_kind"] == "python_callable"


def test_preview_mcp_tool_definition_discovers_child_tools():
    from app.domain.agchain.tool_resolution import preview_tool_definition

    admin = _ToolsRegistryAdmin(tables={"user_variables": []})

    with (
        patch("app.domain.agchain.tool_resolution.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.tool_resolution.require_project_write_access",
            return_value={"project_id": PROJECT_ID, "membership_role": "project_editor"},
        ),
        patch(
            "app.domain.agchain.tool_resolution.discover_mcp_server_tools",
            return_value=[
                {
                    "server_tool_name": "list_files",
                    "display_name": "List Files",
                    "description": "List files from the server.",
                    "input_schema_jsonb": {"type": "object"},
                }
            ],
        ),
    ):
        payload = preview_tool_definition(
            user_id="user-1",
            project_id=PROJECT_ID,
            source_kind="mcp_server",
            draft={
                "tool_version_id": TOOL_VERSION_ID,
                "tool_config_jsonb": {
                    "transport_type": "stdio",
                    "command": "demo-mcp",
                },
            },
        )

    assert payload["validation"]["ok"] is True
    assert payload["discovered_tools"][0]["preview_tool_ref"] == f"mcp:{TOOL_VERSION_ID}:list_files"
    assert payload["normalized_definition"]["tool_config_jsonb"]["transport_type"] == "stdio"


def test_publish_tool_version_requests_admin_only_project_access():
    from app.domain.agchain.tool_registry import publish_tool_version

    admin = _ToolsRegistryAdmin(
        tables={
            "agchain_tools": [
                {
                    "tool_id": TOOL_ID,
                    "project_id": PROJECT_ID,
                    "tool_name": "custom_lookup",
                    "display_name": "Custom Lookup",
                    "description": "Project tool.",
                    "source_kind": "custom",
                    "approval_mode": "manual",
                    "latest_version_id": None,
                    "archived_at": None,
                    "updated_at": "2026-04-01T08:00:00Z",
                }
            ],
            "agchain_tool_versions": [
                {
                    "tool_version_id": TOOL_VERSION_ID,
                    "tool_id": TOOL_ID,
                    "version_label": "v1",
                    "status": "draft",
                    "tool_config_jsonb": {
                        "implementation_kind": "python_callable",
                        "implementation_ref": "pkg.tools.custom_lookup",
                    },
                    "created_at": "2026-04-01T08:00:00Z",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.tool_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.tool_registry.require_project_write_access") as mock_write_access,
    ):
        mock_write_access.return_value = {"project_id": PROJECT_ID, "membership_role": "project_admin"}
        payload = publish_tool_version(
            user_id="user-1",
            project_id=PROJECT_ID,
            tool_id=TOOL_ID,
            tool_version_id=TOOL_VERSION_ID,
        )

    assert payload["tool_version"]["status"] == "published"
    assert payload["tool"]["tool_id"] == TOOL_ID
    assert mock_write_access.call_args.kwargs["allowed_project_roles"] == ("project_admin",)


def test_publish_mcp_tool_version_requires_successful_discovery():
    from app.domain.agchain.tool_registry import publish_tool_version

    admin = _ToolsRegistryAdmin(
        tables={
            "agchain_tools": [
                {
                    "tool_id": TOOL_ID,
                    "project_id": PROJECT_ID,
                    "tool_name": "repo_server",
                    "display_name": "Repo Server",
                    "description": "MCP tool server.",
                    "source_kind": "mcp_server",
                    "approval_mode": "manual",
                    "latest_version_id": None,
                    "archived_at": None,
                    "updated_at": "2026-04-01T08:00:00Z",
                }
            ],
            "agchain_tool_versions": [
                {
                    "tool_version_id": TOOL_VERSION_ID,
                    "tool_id": TOOL_ID,
                    "version_label": "v1",
                    "status": "draft",
                    "tool_config_jsonb": {"transport_type": "stdio", "command": "demo-mcp"},
                    "created_at": "2026-04-01T08:00:00Z",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.tool_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.tool_registry.require_project_write_access") as mock_write_access,
        patch(
            "app.domain.agchain.tool_registry.preview_tool_definition",
            return_value={
                "normalized_definition": {
                    "source_kind": "mcp_server",
                    "tool_config_jsonb": {"transport_type": "stdio", "command": "demo-mcp"},
                },
                "discovered_tools": [],
                "validation": {"ok": True, "errors": [], "warnings": []},
                "missing_secret_slots": [],
            },
        ),
    ):
        mock_write_access.return_value = {"project_id": PROJECT_ID, "membership_role": "project_admin"}
        with pytest.raises(HTTPException, match="at least one child tool"):
            publish_tool_version(
                user_id="user-1",
                project_id=PROJECT_ID,
                tool_id=TOOL_ID,
                tool_version_id=TOOL_VERSION_ID,
            )


def test_archive_tool_requests_admin_only_project_access():
    from app.domain.agchain.tool_registry import archive_tool

    admin = _ToolsRegistryAdmin(
        tables={
            "agchain_tools": [
                {
                    "tool_id": TOOL_ID,
                    "project_id": PROJECT_ID,
                    "tool_name": "custom_lookup",
                    "display_name": "Custom Lookup",
                    "description": "Project tool.",
                    "source_kind": "custom",
                    "approval_mode": "manual",
                    "latest_version_id": TOOL_VERSION_ID,
                    "archived_at": None,
                    "updated_at": "2026-04-01T08:00:00Z",
                }
            ]
        }
    )

    with (
        patch("app.domain.agchain.tool_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.tool_registry.require_project_write_access") as mock_write_access,
    ):
        mock_write_access.return_value = {"project_id": PROJECT_ID, "membership_role": "project_admin"}
        payload = archive_tool(
            user_id="user-1",
            project_id=PROJECT_ID,
            tool_id=TOOL_ID,
        )

    assert payload["tool"]["tool_id"] == TOOL_ID
    assert payload["tool"]["archived_at"] is not None
    assert mock_write_access.call_args.kwargs["allowed_project_roles"] == ("project_admin",)
