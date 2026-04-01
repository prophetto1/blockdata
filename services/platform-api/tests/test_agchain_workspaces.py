from copy import deepcopy
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.project_access import require_project_access
from app.domain.agchain.workspace_registry import create_project, update_project
from app.main import create_app


ORG_ID = "org-1"
PROJECT_ID = "project-1"


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


class _WorkspaceRegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._operation = "select"
        self._payload = None
        self._maybe_single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key: str, value: object):
        self._filters[key] = value
        return self

    def order(self, *_args, **_kwargs):
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
            if self._table_name in self._admin.fail_insert_tables:
                raise HTTPException(status_code=500, detail=f"Failed to insert into {self._table_name}")
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            rows = []
            for payload in payloads:
                row = dict(payload)
                identity_field = self._admin.identity_fields.get(self._table_name)
                if identity_field and identity_field not in row:
                    row[identity_field] = f"{self._table_name}-{len(self._admin.tables.setdefault(self._table_name, [])) + 1}"
                self._admin.tables.setdefault(self._table_name, []).append(row)
                rows.append(row)
            return type("R", (), {"data": rows})()

        if self._operation == "update":
            updated: list[dict[str, object]] = []
            for row in self._admin.tables.get(self._table_name, []):
                if all(row.get(key) == value for key, value in self._filters.items()):
                    row.update(dict(self._payload))
                    updated.append(dict(row))
            return type("R", (), {"data": updated})()

        rows = [
            dict(row)
            for row in self._admin.tables.get(self._table_name, [])
            if all(row.get(key) == value for key, value in self._filters.items())
        ]
        data = rows[0] if self._maybe_single and rows else (None if self._maybe_single else rows)
        return type("R", (), {"data": data})()


class _WorkspaceRegistryAdmin:
    identity_fields = {
        "user_projects": "project_id",
        "agchain_project_memberships": "project_membership_id",
        "agchain_benchmarks": "benchmark_id",
        "agchain_benchmark_versions": "benchmark_version_id",
    }

    def __init__(self, *, tables=None, fail_insert_tables=None):
        self.tables = tables or {}
        self.fail_insert_tables = set(fail_insert_tables or [])

    def table(self, name: str):
        return _WorkspaceRegistryQuery(self, name)

    def rpc(self, name: str, payload: dict[str, object]):
        return _WorkspaceRegistryRpc(self, name, payload)


class _WorkspaceRegistryRpc:
    def __init__(self, admin: _WorkspaceRegistryAdmin, name: str, payload: dict[str, object]):
        self._admin = admin
        self._name = name
        self._payload = payload

    def execute(self):
        if self._name != "create_agchain_project_atomic":
            raise AssertionError(f"Unsupported rpc: {self._name}")

        tables = deepcopy(self._admin.tables)
        now = self._payload["p_now"]
        project_row = {
            "project_id": f"user_projects-{len(tables.setdefault('user_projects', [])) + 1}",
            "owner_id": self._payload["p_user_id"],
            "organization_id": self._payload["p_organization_id"],
            "project_slug": self._payload["p_project_slug"],
            "project_name": self._payload["p_project_name"],
            "description": self._payload["p_description"],
            "created_by": self._payload["p_user_id"],
            "updated_at": now,
        }
        tables["user_projects"].append(project_row)

        membership_row = {
            "project_membership_id": (
                f"agchain_project_memberships-{len(tables.setdefault('agchain_project_memberships', [])) + 1}"
            ),
            "project_id": project_row["project_id"],
            "organization_id": self._payload["p_organization_id"],
            "user_id": self._payload["p_user_id"],
            "membership_role": "project_admin",
            "membership_status": "active",
            "updated_at": now,
        }
        tables["agchain_project_memberships"].append(membership_row)

        primary_benchmark_slug = None
        if self._payload.get("p_seed_initial_benchmark", True):
            benchmark_name = str(self._payload.get("p_initial_benchmark_name") or self._payload["p_project_name"]).strip()
            benchmark_slug = benchmark_name.lower().replace(" ", "-")
            benchmark_row = {
                "benchmark_id": f"agchain_benchmarks-{len(tables.setdefault('agchain_benchmarks', [])) + 1}",
                "project_id": project_row["project_id"],
                "benchmark_slug": benchmark_slug,
                "benchmark_name": benchmark_name,
                "description": self._payload["p_description"],
                "owner_user_id": self._payload["p_user_id"],
                "updated_at": now,
            }
            tables["agchain_benchmarks"].append(benchmark_row)

            if "agchain_benchmark_versions" in self._admin.fail_insert_tables:
                raise HTTPException(status_code=500, detail="Failed to insert into agchain_benchmark_versions")

            version_row = {
                "benchmark_version_id": (
                    f"agchain_benchmark_versions-{len(tables.setdefault('agchain_benchmark_versions', [])) + 1}"
                ),
                "benchmark_id": benchmark_row["benchmark_id"],
                "version_label": "v0.1.0",
                "version_status": "draft",
                "plan_family": "custom",
                "created_by": self._payload["p_user_id"],
                "updated_at": now,
            }
            tables["agchain_benchmark_versions"].append(version_row)
            benchmark_row["current_draft_version_id"] = version_row["benchmark_version_id"]
            primary_benchmark_slug = benchmark_slug

        self._admin.tables = tables
        return type(
            "R",
            (),
            {
                "data": {
                    "project_id": project_row["project_id"],
                    "project_slug": project_row["project_slug"],
                    "primary_benchmark_slug": primary_benchmark_slug,
                }
            },
        )()


def test_list_organizations_returns_selector_rows(client):
    with patch("app.api.routes.agchain_workspaces.list_organizations") as mock_list:
        mock_list.return_value = [
            {
                "organization_id": ORG_ID,
                "organization_slug": "personal-user-1",
                "display_name": "Personal Workspace",
                "membership_role": "organization_admin",
                "is_personal": True,
                "project_count": 2,
            }
        ]

        response = client.get("/agchain/organizations")

    assert response.status_code == 200
    assert response.json()["items"][0]["organization_id"] == ORG_ID


def test_list_projects_returns_workspace_rows(client):
    with patch("app.api.routes.agchain_workspaces.list_projects") as mock_list:
        mock_list.return_value = [
            {
                "project_id": PROJECT_ID,
                "organization_id": ORG_ID,
                "project_slug": "legal-evals",
                "project_name": "Legal Evals",
                "description": "Shared AGChain workspace.",
                "membership_role": "project_admin",
                "updated_at": "2026-03-31T20:00:00Z",
                "primary_benchmark_slug": "legal-10",
                "primary_benchmark_name": "Legal-10",
            }
        ]

        response = client.get("/agchain/projects", params={"organization_id": ORG_ID})

    assert response.status_code == 200
    assert response.json()["items"][0]["project_slug"] == "legal-evals"


def test_create_project_returns_seeded_redirect(client):
    with patch("app.api.routes.agchain_workspaces.create_project") as mock_create:
        mock_create.return_value = {
            "project_id": PROJECT_ID,
            "project_slug": "legal-evals",
            "primary_benchmark_slug": "legal-10",
            "redirect_path": "/app/agchain/projects/legal-evals",
        }

        response = client.post(
            "/agchain/projects",
            json={
                "organization_id": ORG_ID,
                "project_name": "Legal Evals",
                "project_slug": "legal-evals",
                "description": "Shared AGChain workspace.",
                "seed_initial_benchmark": True,
                "initial_benchmark_name": "Legal-10",
            },
        )

    assert response.status_code == 200
    assert response.json()["project_id"] == PROJECT_ID
    assert response.json()["primary_benchmark_slug"] == "legal-10"


def test_get_project_returns_primary_benchmark_and_settings_partitions(client):
    with patch("app.api.routes.agchain_workspaces.get_project") as mock_get:
        mock_get.return_value = {
            "project": {
                "project_id": PROJECT_ID,
                "organization_id": ORG_ID,
                "project_slug": "legal-evals",
                "project_name": "Legal Evals",
                "description": "Shared AGChain workspace.",
                "membership_role": "project_admin",
                "updated_at": "2026-03-31T20:00:00Z",
            },
            "primary_benchmark": {
                "benchmark_id": "benchmark-1",
                "benchmark_slug": "legal-10",
                "benchmark_name": "Legal-10",
                "current_version_id": "version-1",
                "current_version_label": "v0.1.0",
            },
            "settings_partitions": ["project", "organization", "personal"],
        }

        response = client.get(f"/agchain/projects/{PROJECT_ID}")

    assert response.status_code == 200
    assert response.json()["primary_benchmark"]["benchmark_slug"] == "legal-10"
    assert response.json()["settings_partitions"] == ["project", "organization", "personal"]


def test_update_project_rejects_project_editor():
    admin = _WorkspaceRegistryAdmin(
        tables={
            "user_projects": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": ORG_ID,
                    "project_slug": "legal-evals",
                    "project_name": "Legal Evals",
                    "description": "Shared AGChain workspace.",
                }
            ],
            "agchain_project_memberships": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "project_editor",
                    "membership_status": "active",
                }
            ],
            "agchain_organization_members": [],
        }
    )

    with patch("app.domain.agchain.workspace_registry.get_supabase_admin", return_value=admin):
        with pytest.raises(HTTPException) as exc:
            update_project(
                user_id="user-1",
                project_id=PROJECT_ID,
                payload={"project_name": "Renamed Project"},
            )

    assert exc.value.status_code == 403


def test_update_project_allows_organization_admin_bypass():
    admin = _WorkspaceRegistryAdmin(
        tables={
            "user_projects": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": ORG_ID,
                    "project_slug": "legal-evals",
                    "project_name": "Legal Evals",
                    "description": "Shared AGChain workspace.",
                }
            ],
            "agchain_project_memberships": [],
            "agchain_organization_members": [
                {
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                }
            ],
        }
    )

    with patch("app.domain.agchain.workspace_registry.get_supabase_admin", return_value=admin):
        result = update_project(
            user_id="user-1",
            project_id=PROJECT_ID,
            payload={"project_name": "Renamed Project"},
        )

    assert result == {"ok": True, "project_id": PROJECT_ID}
    assert admin.tables["user_projects"][0]["project_name"] == "Renamed Project"


def test_create_project_seeds_initial_benchmark_when_requested():
    admin = _WorkspaceRegistryAdmin(
        tables={
            "agchain_organizations": [
                {
                    "organization_id": ORG_ID,
                    "organization_slug": "personal-user-1",
                    "display_name": "Personal Workspace",
                    "owner_user_id": "user-1",
                    "is_personal": True,
                }
            ],
            "agchain_organization_members": [
                {
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                }
            ],
            "user_projects": [],
            "agchain_project_memberships": [],
            "agchain_benchmarks": [],
            "agchain_benchmark_versions": [],
        }
    )

    with patch("app.domain.agchain.workspace_registry.get_supabase_admin", return_value=admin):
        result = create_project(
            user_id="user-1",
            payload={
                "organization_id": ORG_ID,
                "project_name": "Legal Evals",
                "project_slug": "legal-evals",
                "description": "Shared AGChain workspace.",
                "seed_initial_benchmark": True,
                "initial_benchmark_name": "Legal-10",
            },
        )

    assert result["primary_benchmark_slug"] == "legal-10"
    assert result["project_slug"] == "legal-evals"
    assert len(admin.tables["user_projects"]) == 1
    assert len(admin.tables["agchain_project_memberships"]) == 1
    assert len(admin.tables["agchain_benchmarks"]) == 1
    assert len(admin.tables["agchain_benchmark_versions"]) == 1


def test_create_project_does_not_leave_partial_rows_when_seed_benchmark_version_fails():
    admin = _WorkspaceRegistryAdmin(
        tables={
            "agchain_organizations": [
                {
                    "organization_id": ORG_ID,
                    "organization_slug": "personal-user-1",
                    "display_name": "Personal Workspace",
                    "owner_user_id": "user-1",
                    "is_personal": True,
                }
            ],
            "agchain_organization_members": [
                {
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                }
            ],
            "user_projects": [],
            "agchain_project_memberships": [],
            "agchain_benchmarks": [],
            "agchain_benchmark_versions": [],
        },
        fail_insert_tables={"agchain_benchmark_versions"},
    )

    with patch("app.domain.agchain.workspace_registry.get_supabase_admin", return_value=admin):
        with pytest.raises(HTTPException):
            create_project(
                user_id="user-1",
                payload={
                    "organization_id": ORG_ID,
                    "project_name": "Legal Evals",
                    "project_slug": "legal-evals",
                    "description": "Shared AGChain workspace.",
                    "seed_initial_benchmark": True,
                    "initial_benchmark_name": "Legal-10",
                },
            )

    assert admin.tables["user_projects"] == []
    assert admin.tables["agchain_project_memberships"] == []
    assert admin.tables["agchain_benchmarks"] == []
    assert admin.tables["agchain_benchmark_versions"] == []


def test_require_project_access_denied_log_uses_presence_flags_not_raw_ids():
    admin = _WorkspaceRegistryAdmin(
        tables={
            "user_projects": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": ORG_ID,
                    "project_slug": "legal-evals",
                    "project_name": "Legal Evals",
                    "description": "Shared AGChain workspace.",
                }
            ],
            "agchain_project_memberships": [],
            "agchain_organization_members": [],
        }
    )

    with patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin), patch(
        "app.domain.agchain.project_access.logger"
    ) as mock_logger:
        with pytest.raises(HTTPException) as exc:
            require_project_access(user_id="user-2", project_id=PROJECT_ID)

    assert exc.value.status_code == 403
    _, kwargs = mock_logger.info.call_args
    assert kwargs["extra"]["project_id_present"] is True
    assert kwargs["extra"]["organization_id_present"] is True
    assert "agchain.project_id" not in kwargs["extra"]
    assert "agchain.organization_id" not in kwargs["extra"]
