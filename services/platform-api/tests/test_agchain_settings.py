from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.organization_access import require_organization_permission
from app.main import create_app


ORG_ID = "org-1"


class _SettingsQuery:
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

    def delete(self):
        self._operation = "delete"
        return self

    def execute(self):
        if self._operation == "insert":
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
            updated = []
            for row in self._admin.tables.get(self._table_name, []):
                if all(row.get(key) == value for key, value in self._filters.items()):
                    row.update(dict(self._payload))
                    updated.append(dict(row))
            return type("R", (), {"data": updated})()

        if self._operation == "delete":
            existing_rows = self._admin.tables.get(self._table_name, [])
            remaining = []
            deleted = []
            for row in existing_rows:
                if all(row.get(key) == value for key, value in self._filters.items()):
                    deleted.append(dict(row))
                    continue
                remaining.append(row)
            self._admin.tables[self._table_name] = remaining
            return type("R", (), {"data": deleted})()

        rows = [
            dict(row)
            for row in self._admin.tables.get(self._table_name, [])
            if all(row.get(key) == value for key, value in self._filters.items())
        ]
        data = rows[0] if self._maybe_single and rows else (None if self._maybe_single else rows)
        return type("R", (), {"data": data})()


class _SettingsAdmin:
    identity_fields = {
        "agchain_permission_groups": "permission_group_id",
        "agchain_permission_group_memberships": "permission_group_membership_id",
        "agchain_permission_group_grants": "permission_group_grant_id",
        "agchain_organization_invites": "organization_invite_id",
        "agchain_organization_invite_group_assignments": "organization_invite_group_assignment_id",
    }

    def __init__(self, *, tables=None):
        self.tables = tables or {}

    def table(self, name: str):
        return _SettingsQuery(self, name)


def _mock_user_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="owner@example.com",
    )


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_require_organization_permission_allows_group_grant():
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                }
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-1",
                    "organization_id": ORG_ID,
                    "name": "Analysts",
                    "group_slug": "analysts",
                    "is_system_group": False,
                    "system_group_kind": None,
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-1",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-1",
                    "scope_type": "organization",
                    "permission_key": "organization.members.read",
                }
            ],
        }
    )

    with patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin):
        result = require_organization_permission(
            user_id="user-1",
            organization_id=ORG_ID,
            permission_key="organization.members.read",
        )

    assert result["organization"]["organization_id"] == ORG_ID
    assert result["organization_member"]["organization_member_id"] == "org-member-1"
    assert result["permission_keys"] == {"organization.members.read"}


def test_require_organization_permission_allows_seeded_owner_project_grant():
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                }
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "project",
                    "permission_key": "project.create",
                }
            ],
        }
    )

    with patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin):
        result = require_organization_permission(
            user_id="user-1",
            organization_id=ORG_ID,
            permission_key="project.create",
        )

    assert result["organization_member"]["membership_role"] == "organization_admin"
    assert "project.create" in result["permission_keys"]


def test_require_organization_permission_denies_member_without_grant():
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                }
            ],
            "agchain_permission_groups": [],
            "agchain_permission_group_memberships": [],
            "agchain_permission_group_grants": [],
        }
    )

    with patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin):
        with pytest.raises(HTTPException) as exc:
            require_organization_permission(
                user_id="user-1",
                organization_id=ORG_ID,
                permission_key="organization.members.read",
            )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Organization access denied"


def test_list_organization_members_route_returns_group_summaries(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {
                    "organization_id": ORG_ID,
                    "organization_slug": "personal-user-1",
                    "display_name": "Personal Workspace",
                    "is_personal": True,
                }
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                    "created_at": "2026-04-02T00:00:00Z",
                }
            ],
            "profiles": [
                {
                    "id": "user-1",
                    "email": "owner@example.com",
                    "display_name": "Owner User",
                }
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.members.read",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.organization_members.get_supabase_admin", return_value=admin),
    ):
        response = client.get(f"/agchain/settings/organizations/{ORG_ID}/members")

    assert response.status_code == 200
    payload = response.json()
    assert payload["organization"]["organization_slug"] == "personal-user-1"
    assert payload["items"][0]["email"] == "owner@example.com"
    assert payload["items"][0]["group_count"] == 1
    assert payload["items"][0]["groups"][0]["system_group_kind"] == "owners"


def test_list_organization_members_route_denies_without_permission(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                }
            ],
            "agchain_permission_groups": [],
            "agchain_permission_group_memberships": [],
            "agchain_permission_group_grants": [],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.organization_members.get_supabase_admin", return_value=admin),
    ):
        response = client.get(f"/agchain/settings/organizations/{ORG_ID}/members")

    assert response.status_code == 403
    assert response.json()["detail"] == "Organization access denied"


def test_create_member_invitations_route_returns_batch_outcomes_and_persists_hashes(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {
                    "organization_id": ORG_ID,
                    "organization_slug": "personal-user-1",
                    "display_name": "Personal Workspace",
                    "is_personal": True,
                }
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                    "created_at": "2026-04-02T00:00:00Z",
                },
                {
                    "organization_member_id": "org-member-2",
                    "organization_id": ORG_ID,
                    "user_id": "user-2",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                    "created_at": "2026-04-02T00:00:00Z",
                },
            ],
            "profiles": [
                {"id": "user-1", "email": "owner@example.com", "display_name": "Owner User"},
                {"id": "user-2", "email": "existing@example.com", "display_name": "Existing User"},
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                },
                {
                    "permission_group_id": "group-analysts",
                    "organization_id": ORG_ID,
                    "name": "Analysts",
                    "group_slug": "analysts",
                    "is_system_group": False,
                    "system_group_kind": None,
                },
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.members.invite",
                }
            ],
            "agchain_organization_invites": [
                {
                    "organization_invite_id": "invite-existing",
                    "organization_id": ORG_ID,
                    "invited_email": "pending@example.com",
                    "invited_email_normalized": "pending@example.com",
                    "invite_token_hash": "existing-hash",
                    "invited_by_user_id": "user-1",
                    "invite_status": "pending",
                    "expires_at": "2026-05-01T00:00:00Z",
                    "created_at": "2026-04-02T00:00:00Z",
                    "updated_at": "2026-04-02T00:00:00Z",
                }
            ],
            "agchain_organization_invite_group_assignments": [],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.organization_members.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.organization_members.secrets.token_urlsafe", return_value="raw-token"),
    ):
        response = client.post(
            f"/agchain/settings/organizations/{ORG_ID}/member-invitations",
            json={
                "emails": [
                    "newperson@example.com",
                    "existing@example.com",
                    "pending@example.com",
                    "not-an-email",
                ],
                "permission_group_ids": ["group-analysts"],
            },
        )

    assert response.status_code == 200
    payload = response.json()
    outcomes = {item["email"]: item["outcome"] for item in payload["results"]}
    assert outcomes["newperson@example.com"] == "invite_created"
    assert outcomes["existing@example.com"] == "already_member"
    assert outcomes["pending@example.com"] == "already_pending"
    assert outcomes["not-an-email"] == "invalid_email"

    created_invite = next(
        row
        for row in admin.tables["agchain_organization_invites"]
        if row["invited_email_normalized"] == "newperson@example.com"
    )
    assert created_invite["invite_token_hash"] != "raw-token"
    assert created_invite["invite_status"] == "pending"
    assert admin.tables["agchain_organization_invite_group_assignments"][0]["permission_group_id"] == "group-analysts"


def test_patch_membership_status_route_blocks_last_owner_disable(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                    "updated_at": "2026-04-02T00:00:00Z",
                }
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.members.remove",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.organization_members.get_supabase_admin", return_value=admin),
    ):
        response = client.patch(
            f"/agchain/settings/organizations/{ORG_ID}/members/org-member-1",
            json={"membership_status": "disabled"},
        )

    assert response.status_code == 409
    assert response.json()["detail"] == "At least one owner must remain active"


def test_patch_membership_status_route_updates_non_owner_member(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                    "updated_at": "2026-04-02T00:00:00Z",
                },
                {
                    "organization_member_id": "org-member-2",
                    "organization_id": ORG_ID,
                    "user_id": "user-2",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                    "updated_at": "2026-04-02T00:00:00Z",
                },
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.members.remove",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.organization_members.get_supabase_admin", return_value=admin),
    ):
        disable_response = client.patch(
            f"/agchain/settings/organizations/{ORG_ID}/members/org-member-2",
            json={"membership_status": "disabled"},
        )
        reactivate_response = client.patch(
            f"/agchain/settings/organizations/{ORG_ID}/members/org-member-2",
            json={"membership_status": "active"},
        )

    assert disable_response.status_code == 200
    assert disable_response.json()["member"]["membership_status"] == "disabled"
    assert reactivate_response.status_code == 200
    assert reactivate_response.json()["member"]["membership_status"] == "active"


def test_permission_group_definitions_route_returns_backend_registry(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                }
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.permission_groups.read",
                }
            ],
        }
    )

    with patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin):
        response = client.get(f"/agchain/settings/organizations/{ORG_ID}/permission-definitions")

    assert response.status_code == 200
    payload = response.json()
    assert any(item["permission_key"] == "organization.members.invite" for item in payload["organization_permissions"])
    assert any(item["permission_key"] == "project.create" for item in payload["project_permissions"])
    assert payload["protected_system_groups"][0]["system_group_kind"] == "owners"


def test_permission_group_list_route_returns_counts_and_protected_owners(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {
                    "organization_id": ORG_ID,
                    "organization_slug": "personal-user-1",
                    "display_name": "Personal Workspace",
                }
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                },
                {
                    "organization_member_id": "org-member-2",
                    "organization_id": ORG_ID,
                    "user_id": "user-2",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                },
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "description": "System owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                    "created_at": "2026-04-02T00:00:00Z",
                    "updated_at": "2026-04-02T00:00:00Z",
                },
                {
                    "permission_group_id": "group-analysts",
                    "organization_id": ORG_ID,
                    "name": "Analysts",
                    "group_slug": "analysts",
                    "description": "Read-only analysts",
                    "is_system_group": False,
                    "system_group_kind": None,
                    "created_at": "2026-04-02T00:00:00Z",
                    "updated_at": "2026-04-02T00:00:00Z",
                },
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                },
                {
                    "permission_group_membership_id": "membership-2",
                    "permission_group_id": "group-analysts",
                    "organization_member_id": "org-member-2",
                },
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.permission_groups.read",
                },
                {
                    "permission_group_grant_id": "grant-2",
                    "permission_group_id": "group-owners",
                    "scope_type": "project",
                    "permission_key": "project.create",
                },
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.permission_groups.get_supabase_admin", return_value=admin),
    ):
        response = client.get(f"/agchain/settings/organizations/{ORG_ID}/permission-groups")

    assert response.status_code == 200
    payload = response.json()
    owners = next(item for item in payload["items"] if item["permission_group_id"] == "group-owners")
    assert owners["is_system_group"] is True
    assert owners["member_count"] == 1
    assert owners["organization_permission_count"] == 1
    assert owners["project_permission_count"] == 1


def test_permission_group_create_route_persists_group_and_rejects_invalid_keys(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                }
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "description": "System owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                    "created_at": "2026-04-02T00:00:00Z",
                    "updated_at": "2026-04-02T00:00:00Z",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.permission_groups.manage",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.permission_groups.get_supabase_admin", return_value=admin),
    ):
        create_response = client.post(
            f"/agchain/settings/organizations/{ORG_ID}/permission-groups",
            json={
                "name": "Analysts",
                "description": "Read-only org members",
                "permission_keys": [
                    "organization.members.read",
                    "organization.permission_groups.read",
                ],
            },
        )
        invalid_response = client.post(
            f"/agchain/settings/organizations/{ORG_ID}/permission-groups",
            json={
                "name": "Too Powerful",
                "description": "Should be rejected",
                "permission_keys": ["project.create"],
            },
        )

    assert create_response.status_code == 200
    created_group = create_response.json()["group"]
    assert created_group["name"] == "Analysts"
    assert created_group["organization_permission_count"] == 2
    assert any(row["group_slug"] == "analysts" for row in admin.tables["agchain_permission_groups"])
    assert invalid_response.status_code == 400
    assert invalid_response.json()["detail"] == "Invalid permission key"


def test_permission_group_detail_and_members_routes_return_grants_and_members(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                    "created_at": "2026-04-02T00:00:00Z",
                },
                {
                    "organization_member_id": "org-member-2",
                    "organization_id": ORG_ID,
                    "user_id": "user-2",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                    "created_at": "2026-04-02T00:00:00Z",
                },
            ],
            "profiles": [
                {"id": "user-1", "email": "owner@example.com", "display_name": "Owner User"},
                {"id": "user-2", "email": "member@example.com", "display_name": "Member User"},
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "description": "System owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                    "created_at": "2026-04-02T00:00:00Z",
                    "updated_at": "2026-04-02T00:00:00Z",
                }
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                },
                {
                    "permission_group_membership_id": "membership-2",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-2",
                },
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.permission_groups.read",
                },
                {
                    "permission_group_grant_id": "grant-2",
                    "permission_group_id": "group-owners",
                    "scope_type": "project",
                    "permission_key": "project.create",
                },
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.permission_groups.get_supabase_admin", return_value=admin),
    ):
        detail_response = client.get(
            f"/agchain/settings/organizations/{ORG_ID}/permission-groups/group-owners"
        )
        members_response = client.get(
            f"/agchain/settings/organizations/{ORG_ID}/permission-groups/group-owners/members"
        )

    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["group"]["system_group_kind"] == "owners"
    assert detail_payload["grants"]["organization"] == ["organization.permission_groups.read"]
    assert detail_payload["grants"]["project"] == ["project.create"]

    assert members_response.status_code == 200
    members_payload = members_response.json()
    assert len(members_payload["items"]) == 2
    assert members_payload["items"][0]["email"] in {"owner@example.com", "member@example.com"}


def test_permission_group_member_mutations_add_members_and_block_last_owner_removal(client):
    admin = _SettingsAdmin(
        tables={
            "agchain_organizations": [
                {"organization_id": ORG_ID, "display_name": "Personal Workspace"},
            ],
            "agchain_organization_members": [
                {
                    "organization_member_id": "org-member-1",
                    "organization_id": ORG_ID,
                    "user_id": "user-1",
                    "membership_role": "organization_admin",
                    "membership_status": "active",
                },
                {
                    "organization_member_id": "org-member-2",
                    "organization_id": ORG_ID,
                    "user_id": "user-2",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                },
            ],
            "agchain_permission_groups": [
                {
                    "permission_group_id": "group-owners",
                    "organization_id": ORG_ID,
                    "name": "Owners",
                    "group_slug": "owners",
                    "description": "System owners",
                    "is_system_group": True,
                    "system_group_kind": "owners",
                },
                {
                    "permission_group_id": "group-analysts",
                    "organization_id": ORG_ID,
                    "name": "Analysts",
                    "group_slug": "analysts",
                    "description": "Read-only org members",
                    "is_system_group": False,
                    "system_group_kind": None,
                },
            ],
            "agchain_permission_group_memberships": [
                {
                    "permission_group_membership_id": "membership-1",
                    "permission_group_id": "group-owners",
                    "organization_member_id": "org-member-1",
                }
            ],
            "agchain_permission_group_grants": [
                {
                    "permission_group_grant_id": "grant-1",
                    "permission_group_id": "group-owners",
                    "scope_type": "organization",
                    "permission_key": "organization.permission_groups.manage",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.organization_access.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.permission_groups.get_supabase_admin", return_value=admin),
    ):
        add_response = client.post(
            f"/agchain/settings/organizations/{ORG_ID}/permission-groups/group-analysts/members",
            json={"organization_member_ids": ["org-member-2"]},
        )
        remove_response = client.delete(
            f"/agchain/settings/organizations/{ORG_ID}/permission-groups/group-owners/members/org-member-1"
        )

    assert add_response.status_code == 200
    assert add_response.json()["added_count"] == 1
    assert any(
        row["permission_group_id"] == "group-analysts" and row["organization_member_id"] == "org-member-2"
        for row in admin.tables["agchain_permission_group_memberships"]
    )
    assert remove_response.status_code == 409
    assert remove_response.json()["detail"] == "At least one owner must remain active"
