from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_superuser, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.dataset_registry import (
    commit_dataset_version_draft,
    create_dataset,
    create_dataset_version_draft,
    get_dataset_version_draft,
    preview_dataset_version,
    update_dataset_version_draft,
)
from app.domain.agchain.inspect_dataset_materializer import preview_dataset_source
from app.main import create_app

DATASET_ID = "11111111-1111-1111-1111-111111111111"
VERSION_ID = "22222222-2222-2222-2222-222222222222"
SAMPLE_ID = "sample-1"
PROJECT_ID = "project-1"


def _mock_user_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="user@example.com",
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


class _DatasetRegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._in_filters: dict[str, set[object]] = {}
        self._operation = "select"
        self._payload = None
        self._maybe_single = False
        self._limit: int | None = None
        self._order_key: str | None = None
        self._order_desc = False

    def select(self, *_args, **_kwargs):
        self._operation = "select"
        return self

    def eq(self, key: str, value: object):
        self._filters[key] = value
        return self

    def in_(self, key: str, values):
        self._in_filters[key] = set(values)
        return self

    def order(self, key: str, *, desc: bool = False):
        self._order_key = key
        self._order_desc = desc
        return self

    def limit(self, value: int):
        self._limit = value
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
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            rows = []
            for payload in payloads:
                row = dict(payload)
                identity_field = self._admin.identity_fields.get(self._table_name)
                if identity_field and identity_field not in row:
                    row[identity_field] = f"{self._table_name}-{len(self._admin.tables.setdefault(self._table_name, [])) + 1}"
                self._admin.tables.setdefault(self._table_name, []).append(row)
                rows.append(dict(row))
            return type("R", (), {"data": rows})()

        if self._operation == "update":
            updated = []
            for row in self._admin.tables.get(self._table_name, []):
                if all(row.get(key) == value for key, value in self._filters.items()) and all(
                    row.get(key) in values for key, values in self._in_filters.items()
                ):
                    row.update(dict(self._payload or {}))
                    updated.append(dict(row))
            return type("R", (), {"data": updated})()

        rows = list(self._admin.tables.get(self._table_name, []))
        rows = [
            row
            for row in rows
            if all(row.get(key) == value for key, value in self._filters.items())
            and all(row.get(key) in values for key, values in self._in_filters.items())
        ]
        if self._order_key is not None:
            rows.sort(key=lambda row: row.get(self._order_key) or "", reverse=self._order_desc)
        if self._limit is not None:
            rows = rows[:self._limit]
        data = rows[0] if self._maybe_single and rows else (None if self._maybe_single else rows)
        return type("R", (), {"data": data})()


class _DatasetRegistryAdmin:
    identity_fields = {
        "agchain_datasets": "dataset_id",
        "agchain_dataset_versions": "dataset_version_id",
        "agchain_dataset_version_drafts": "draft_id",
        "agchain_dataset_samples": "dataset_sample_id",
        "agchain_dataset_version_validations": "dataset_version_validation_id",
        "agchain_operations": "operation_id",
    }

    def __init__(self, *, tables=None):
        self.tables = tables or {}

    def table(self, name: str):
        return _DatasetRegistryQuery(self, name)


def _new_preview_body(**overrides):
    body = {
        "project_id": PROJECT_ID,
        "source_type": "jsonl",
        "source_upload_id": None,
        "source_uri": "gs://bucket/legal.jsonl",
        "source_config_jsonb": {
            "source_type": "jsonl",
            "source_uri": "gs://bucket/legal.jsonl",
            "line_mode": "jsonl",
        },
        "field_spec_jsonb": {
            "input": {"path": "$.prompt"},
            "target": {"path": "$.answer"},
            "id": {"path": "$.id"},
            "metadata": {"path": "$.metadata"},
            "sandbox": {"path": "$.sandbox"},
            "files": {"path": "$.files"},
            "setup": {"path": "$.setup"},
        },
        "materialization_options_jsonb": {
            "shuffle": False,
            "shuffle_choices": False,
            "limit": None,
            "auto_id": True,
            "deterministic_seed": None,
        },
    }
    body.update(overrides)
    return body


def _preview_payload(**overrides):
    preview_sample = {
        "input": "Summarize the contract.",
        "target": "A short summary",
        "id": SAMPLE_ID,
        "metadata": {"difficulty": "medium"},
        "sandbox": {"profile": "python"},
        "files": [{"name": "contract.txt"}],
        "setup": {"cwd": "/tmp/task"},
    }
    payload = {
        "ok": True,
        "preview_id": "preview-1",
        "sample_count": 1,
        "preview_samples": [preview_sample],
        "validation_summary": {
            "validation_status": "pass",
            "issue_groups": [],
            "warning_counts": {
                "warning_count": 0,
                "duplicate_id_count": 0,
                "missing_field_count": 0,
                "unsupported_payload_count": 0,
            },
            "generated_at": "2026-04-01T07:00:00Z",
        },
        "field_resolution_summary": {
            "resolved_fields": ["input", "target", "id", "metadata", "sandbox", "files", "setup"],
        },
        "parse_summary_jsonb": {
            "field_resolution_summary": {
                "resolved_fields": ["input", "target", "id", "metadata", "sandbox", "files", "setup"]
            }
        },
        "checksum": "sha256:preview-1",
        "sample_rows": [
            {
                "sample_id": SAMPLE_ID,
                "canonical_sample_jsonb": preview_sample,
                "summary_jsonb": {
                    "input_preview": "Summarize the contract.",
                    "target_preview": "A short summary",
                    "choice_count": 0,
                    "metadata_summary": {"difficulty": "medium"},
                },
                "metadata_jsonb": {"difficulty": "medium"},
                "has_setup": True,
                "has_sandbox": True,
                "has_files": True,
                "parse_status": "ok",
            }
        ],
    }
    payload.update(overrides)
    return payload


def _dataset_and_version_payload(**overrides):
    payload = {
        "ok": True,
        "dataset": {
            "dataset_id": DATASET_ID,
            "project_id": PROJECT_ID,
            "slug": "legal-qa",
            "name": "Legal QA",
            "description": "Legal evaluation samples.",
            "tags": ["legal"],
            "status": "active",
            "source_type": "jsonl",
            "latest_version_id": VERSION_ID,
            "latest_version_label": "v1",
            "sample_count": 1,
            "validation_status": "pass",
            "updated_at": "2026-04-01T07:00:00Z",
        },
        "version": {
            "dataset_version_id": VERSION_ID,
            "version_label": "v1",
            "created_at": "2026-04-01T07:00:00Z",
            "sample_count": 1,
            "checksum": "sha256:preview-1",
            "validation_status": "pass",
            "base_version_id": None,
        },
    }
    payload.update(overrides)
    return payload


def _draft_payload(**overrides):
    payload = {
        "draft_id": "draft-1",
        "base_version_id": VERSION_ID,
        "version_label": "v2",
        "source_config_jsonb": _new_preview_body()["source_config_jsonb"],
        "field_spec_jsonb": _new_preview_body()["field_spec_jsonb"],
        "materialization_options_jsonb": _new_preview_body()["materialization_options_jsonb"],
        "preview_summary": {
            "sample_count": 1,
            "preview_samples": _preview_payload()["preview_samples"],
        },
        "validation_summary": _preview_payload()["validation_summary"],
        "dirty_state": {"is_dirty": False, "changed_fields": []},
    }
    payload.update(overrides)
    return payload


def _operation_payload(**overrides):
    payload = {
        "operation_id": "operation-1",
        "operation_type": "dataset_preview",
        "status": "queued",
        "poll_url": "/agchain/operations/operation-1",
        "cancel_url": "/agchain/operations/operation-1/cancel",
        "target_kind": "dataset_version_draft",
        "target_id": "draft-1",
        "attempt_count": 0,
        "progress": {},
        "last_error": None,
        "result": None,
        "created_at": "2026-04-01T07:00:00Z",
        "started_at": "2026-04-01T07:00:00Z",
        "heartbeat_at": None,
        "completed_at": None,
    }
    payload.update(overrides)
    return payload


def _authorized_tables():
    return {
        "user_projects": [
            {"project_id": PROJECT_ID, "organization_id": "org-1"},
        ],
        "agchain_project_memberships": [
            {
                "project_id": PROJECT_ID,
                "organization_id": "org-1",
                "user_id": "user-1",
                "membership_role": "project_admin",
                "membership_status": "active",
            }
        ],
        "agchain_organization_members": [
            {
                "organization_id": "org-1",
                "user_id": "user-1",
                "membership_role": "organization_member",
                "membership_status": "active",
            }
        ],
    }


def test_list_datasets_returns_wrapped_rows(client):
    with patch("app.api.routes.agchain_datasets.list_datasets") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "dataset_id": DATASET_ID,
                    "slug": "legal-qa",
                    "name": "Legal QA",
                    "description": "Legal evaluation samples.",
                    "status": "active",
                    "source_type": "jsonl",
                    "latest_version_id": VERSION_ID,
                    "latest_version_label": "v1",
                    "sample_count": 24,
                    "validation_status": "warn",
                    "updated_at": "2026-03-31T09:00:00Z",
                }
            ],
            "next_cursor": "cursor-2",
        }
        response = client.get(
            "/agchain/datasets",
            params={
                "project_id": PROJECT_ID,
                "search": "legal",
                "source_type": "jsonl",
                "status": "active",
                "validation_status": "warn",
                "limit": 25,
                "offset": 0,
            },
        )

    assert response.status_code == 200
    assert response.json()["items"][0]["dataset_id"] == DATASET_ID
    assert response.json()["next_cursor"] == "cursor-2"
    mock_list.assert_called_once_with(
        user_id="user-1",
        project_id=PROJECT_ID,
        search="legal",
        source_type="jsonl",
        status="active",
        validation_status="warn",
        limit=25,
        cursor=None,
        offset=0,
    )


def test_get_dataset_bootstrap_returns_defaults(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_bootstrap") as mock_bootstrap:
        mock_bootstrap.return_value = {
            "allowed_source_types": ["csv", "json", "jsonl", "huggingface"],
            "field_spec_defaults": {
                "input": None,
                "messages": None,
                "choices": None,
                "target": None,
                "id": None,
                "metadata": None,
                "sandbox": None,
                "files": None,
                "setup": None,
            },
            "source_config_defaults": {
                "csv": {"delimiter": ",", "headers": True},
                "jsonl": {"line_mode": "jsonl"},
            },
            "materialization_defaults": {
                "shuffle": False,
                "shuffle_choices": False,
                "limit": None,
                "auto_id": True,
                "deterministic_seed": None,
            },
            "upload_limits": {"max_bytes": 10485760},
            "validation_rules": {"required_fields": ["input"]},
        }
        response = client.get("/agchain/datasets/new/bootstrap")

    assert response.status_code == 200
    assert response.json()["allowed_source_types"] == ["csv", "json", "jsonl", "huggingface"]


def test_preview_new_dataset_route_returns_preview_contract(client):
    with patch("app.api.routes.agchain_datasets.preview_dataset_source") as mock_preview:
        mock_preview.return_value = _preview_payload()
        response = client.post("/agchain/datasets/new/preview", json=_new_preview_body())

    assert response.status_code == 200
    assert response.json()["preview_id"] == "preview-1"
    mock_preview.assert_called_once_with(user_id="user-1", payload=_new_preview_body())


def test_preview_new_dataset_route_returns_operation_payload_with_202(client):
    with patch("app.api.routes.agchain_datasets.preview_dataset_source") as mock_preview:
        mock_preview.return_value = _operation_payload()
        response = client.post("/agchain/datasets/new/preview", json=_new_preview_body())

    assert response.status_code == 202
    assert response.json()["operation_id"] == "operation-1"


def test_create_dataset_route_returns_dataset_and_version(client):
    request_body = {
        **_new_preview_body(),
        "name": "Legal QA",
        "slug": "legal-qa",
        "description": "Legal evaluation samples.",
        "tags": ["legal"],
        "initial_version_label": "v1",
    }
    with patch("app.api.routes.agchain_datasets.create_dataset") as mock_create:
        mock_create.return_value = _dataset_and_version_payload()
        response = client.post("/agchain/datasets", json=request_body)

    assert response.status_code == 200
    assert response.json()["dataset"]["dataset_id"] == DATASET_ID
    assert response.json()["version"]["dataset_version_id"] == VERSION_ID
    mock_create.assert_called_once_with(user_id="user-1", payload=request_body)


def test_preview_dataset_version_route_returns_preview_contract(client):
    with patch("app.api.routes.agchain_datasets.preview_dataset_version") as mock_preview:
        mock_preview.return_value = _preview_payload(ok=True, dataset_version_id=VERSION_ID)
        response = client.post(
            f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/preview",
            json={"refresh": True},
        )

    assert response.status_code == 200
    assert response.json()["dataset_version_id"] == VERSION_ID
    mock_preview.assert_called_once_with(
        user_id="user-1",
        dataset_id=DATASET_ID,
        dataset_version_id=VERSION_ID,
        payload={"refresh": True},
    )


def test_create_dataset_version_draft_route_returns_draft(client):
    with patch("app.api.routes.agchain_datasets.create_dataset_version_draft") as mock_create:
        mock_create.return_value = {"ok": True, "draft": _draft_payload()}
        response = client.post(
            f"/agchain/datasets/{DATASET_ID}/version-drafts",
            json={"base_version_id": VERSION_ID},
        )

    assert response.status_code == 200
    assert response.json()["draft"]["draft_id"] == "draft-1"
    mock_create.assert_called_once_with(
        user_id="user-1",
        dataset_id=DATASET_ID,
        payload={"base_version_id": VERSION_ID},
    )


def test_get_dataset_version_draft_route_returns_draft(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_version_draft") as mock_get:
        mock_get.return_value = _draft_payload()
        response = client.get(f"/agchain/datasets/{DATASET_ID}/version-drafts/draft-1")

    assert response.status_code == 200
    assert response.json()["draft_id"] == "draft-1"
    mock_get.assert_called_once_with(user_id="user-1", dataset_id=DATASET_ID, draft_id="draft-1")


def test_update_dataset_version_draft_route_returns_updated_draft(client):
    with patch("app.api.routes.agchain_datasets.update_dataset_version_draft") as mock_update:
        mock_update.return_value = {"ok": True, "draft": _draft_payload(version_label="v2-revised")}
        response = client.patch(
            f"/agchain/datasets/{DATASET_ID}/version-drafts/draft-1",
            json={"version_label": "v2-revised"},
        )

    assert response.status_code == 200
    assert response.json()["draft"]["version_label"] == "v2-revised"
    mock_update.assert_called_once_with(
        user_id="user-1",
        dataset_id=DATASET_ID,
        draft_id="draft-1",
        payload={"version_label": "v2-revised"},
    )


def test_preview_dataset_version_draft_route_returns_preview_contract(client):
    with patch("app.api.routes.agchain_datasets.preview_dataset_version_draft") as mock_preview:
        mock_preview.return_value = _preview_payload(diff_summary={"changed_fields": ["target"]})
        response = client.post(
            f"/agchain/datasets/{DATASET_ID}/version-drafts/draft-1/preview",
            json={"use_saved": True},
        )

    assert response.status_code == 200
    assert response.json()["preview_samples"][0]["id"] == SAMPLE_ID
    mock_preview.assert_called_once_with(
        user_id="user-1",
        dataset_id=DATASET_ID,
        draft_id="draft-1",
        payload={"use_saved": True},
    )


def test_commit_dataset_version_draft_route_returns_dataset_and_version(client):
    with patch("app.api.routes.agchain_datasets.commit_dataset_version_draft") as mock_commit:
        mock_commit.return_value = _dataset_and_version_payload()
        response = client.post(
            f"/agchain/datasets/{DATASET_ID}/version-drafts/draft-1/commit",
            json={"commit_message": "Publish new canonical samples"},
        )

    assert response.status_code == 200
    assert response.json()["version"]["dataset_version_id"] == VERSION_ID
    mock_commit.assert_called_once_with(
        user_id="user-1",
        dataset_id=DATASET_ID,
        draft_id="draft-1",
        payload={"commit_message": "Publish new canonical samples"},
    )


def test_commit_dataset_version_draft_route_returns_operation_payload_with_202(client):
    with patch("app.api.routes.agchain_datasets.commit_dataset_version_draft") as mock_commit:
        mock_commit.return_value = _operation_payload(
            operation_type="dataset_materialization",
            target_kind="dataset",
            target_id=DATASET_ID,
        )
        response = client.post(
            f"/agchain/datasets/{DATASET_ID}/version-drafts/draft-1/commit",
            json={},
        )

    assert response.status_code == 202
    assert response.json()["operation_type"] == "dataset_materialization"


def test_list_datasets_route_telemetry_uses_presence_flags_not_raw_ids(client):
    with patch("app.api.routes.agchain_datasets.list_datasets") as mock_list, patch(
        "app.api.routes.agchain_datasets.set_span_attributes"
    ) as mock_set_attrs:
        mock_list.return_value = {"items": [], "next_cursor": None}

        response = client.get("/agchain/datasets", params={"project_id": PROJECT_ID})

    assert response.status_code == 200
    _, attrs = mock_set_attrs.call_args.args
    assert attrs["project_id_present"] is True
    assert "agchain.project_id" not in attrs


def test_get_dataset_bootstrap_telemetry_uses_presence_flags_not_raw_ids(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_bootstrap") as mock_bootstrap, patch(
        "app.api.routes.agchain_datasets.set_span_attributes"
    ) as mock_set_attrs:
        mock_bootstrap.return_value = {
            "allowed_source_types": ["csv"],
            "field_spec_defaults": {},
            "source_config_defaults": {},
            "materialization_defaults": {},
            "upload_limits": {},
            "validation_rules": {},
        }

        response = client.get("/agchain/datasets/new/bootstrap", params={"project_id": PROJECT_ID})

    assert response.status_code == 200
    _, attrs = mock_set_attrs.call_args.args
    assert attrs["project_id_present"] is True
    assert "agchain.project_id" not in attrs
    assert "agchain.project_access_enforced" not in attrs


def test_get_dataset_detail_returns_workspace_contract(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_detail") as mock_detail:
        mock_detail.return_value = {
            "dataset": {
                "dataset_id": DATASET_ID,
                "slug": "legal-qa",
                "name": "Legal QA",
                "description": "Legal evaluation samples.",
                "tags": ["legal", "qa"],
                "status": "active",
                "source_type": "jsonl",
                "latest_version_id": VERSION_ID,
                "latest_version_label": "v1",
                "sample_count": 24,
                "validation_status": "warn",
                "updated_at": "2026-03-31T09:00:00Z",
            },
            "selected_version": {
                "dataset_version_id": VERSION_ID,
                "version_label": "v1",
                "created_at": "2026-03-31T09:00:00Z",
                "sample_count": 24,
                "checksum": "sha256:abc",
                "validation_status": "warn",
                "base_version_id": None,
            },
            "tab_counts": {"samples": 24, "warnings": 3, "versions": 2},
            "warnings_summary": {
                "warning_count": 3,
                "duplicate_id_count": 1,
                "missing_field_count": 1,
                "unsupported_payload_count": 1,
            },
            "available_actions": ["preview", "create_version_draft", "archive"],
        }
        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/detail",
            params={"project_id": PROJECT_ID, "version_id": VERSION_ID},
        )

    assert response.status_code == 200
    assert response.json()["dataset"]["slug"] == "legal-qa"
    assert response.json()["selected_version"]["dataset_version_id"] == VERSION_ID
    mock_detail.assert_called_once_with(
        user_id="user-1",
        project_id=PROJECT_ID,
        dataset_id=DATASET_ID,
        version_id=VERSION_ID,
    )


def test_get_dataset_detail_telemetry_does_not_emit_raw_dataset_ids(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_detail") as mock_detail, patch(
        "app.api.routes.agchain_datasets.set_span_attributes"
    ) as mock_set_attrs:
        mock_detail.return_value = {
            "dataset": {"dataset_id": DATASET_ID, "slug": "legal-qa"},
            "selected_version": {"dataset_version_id": VERSION_ID},
            "tab_counts": {"samples": 0, "warnings": 0, "versions": 1},
            "warnings_summary": {"warning_count": 0},
            "available_actions": [],
        }

        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/detail",
            params={"project_id": PROJECT_ID, "version_id": VERSION_ID},
        )

    assert response.status_code == 200
    _, attrs = mock_set_attrs.call_args.args
    assert attrs["project_id_present"] is True
    assert "agchain.project_id" not in attrs
    assert "agchain.dataset_id" not in attrs


def test_list_dataset_versions_returns_envelope(client):
    with patch("app.api.routes.agchain_datasets.list_dataset_versions") as mock_versions:
        mock_versions.return_value = {
            "items": [
                {
                    "dataset_version_id": VERSION_ID,
                    "version_label": "v1",
                    "created_at": "2026-03-31T09:00:00Z",
                    "sample_count": 24,
                    "checksum": "sha256:abc",
                    "validation_status": "warn",
                    "base_version_id": None,
                }
            ],
            "next_cursor": None,
        }
        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/versions",
            params={"project_id": PROJECT_ID, "limit": 20, "offset": 0},
        )

    assert response.status_code == 200
    assert response.json()["items"][0]["version_label"] == "v1"
    mock_versions.assert_called_once_with(
        user_id="user-1",
        project_id=PROJECT_ID,
        dataset_id=DATASET_ID,
        limit=20,
        cursor=None,
        offset=0,
    )


def test_get_dataset_version_source_returns_contract(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_version_source") as mock_source:
        mock_source.return_value = {
            "dataset_version_id": VERSION_ID,
            "source_type": "jsonl",
            "source_uri": "gs://bucket/legal.jsonl",
            "source_config_jsonb": {
                "source_type": "jsonl",
                "source_uri": "gs://bucket/legal.jsonl",
                "line_mode": "jsonl",
            },
        }
        response = client.get(f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/source")

    assert response.status_code == 200
    assert response.json()["dataset_version_id"] == VERSION_ID
    assert response.json()["source_type"] == "jsonl"


def test_get_dataset_version_mapping_returns_contract(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_version_mapping") as mock_mapping:
        mock_mapping.return_value = {
            "dataset_version_id": VERSION_ID,
            "field_spec_jsonb": {
                "input": {"path": "$.prompt"},
                "messages": None,
                "choices": None,
                "target": {"path": "$.answer"},
                "id": {"path": "$.id"},
                "metadata": {"path": "$.metadata"},
                "sandbox": None,
                "files": None,
                "setup": None,
            },
            "field_resolution_summary": {"resolved_fields": ["input", "target", "id"]},
        }
        response = client.get(f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/mapping")

    assert response.status_code == 200
    assert response.json()["field_spec_jsonb"]["input"] == {"path": "$.prompt"}


def test_get_dataset_version_validation_returns_contract(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_version_validation") as mock_validation:
        mock_validation.return_value = {
            "dataset_version_id": VERSION_ID,
            "validation_status": "warn",
            "issue_groups": [
                {
                    "key": "duplicate_id",
                    "label": "Duplicate sample ids",
                    "count": 1,
                    "issues": [{"sample_id": SAMPLE_ID}],
                }
            ],
            "warning_counts": {
                "warning_count": 3,
                "duplicate_id_count": 1,
                "missing_field_count": 1,
                "unsupported_payload_count": 1,
            },
            "generated_at": "2026-03-31T09:05:00Z",
        }
        response = client.get(f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/validation")

    assert response.status_code == 200
    assert response.json()["validation_status"] == "warn"
    assert response.json()["issue_groups"][0]["key"] == "duplicate_id"


def test_list_dataset_samples_returns_envelope(client):
    with patch("app.api.routes.agchain_datasets.list_dataset_samples") as mock_samples:
        mock_samples.return_value = {
            "items": [
                {
                    "sample_id": SAMPLE_ID,
                    "input_preview": "Summarize the contract.",
                    "target_preview": "A short summary",
                    "choice_count": 4,
                    "metadata_summary": {"difficulty": "medium"},
                    "has_setup": False,
                    "has_sandbox": True,
                    "has_files": False,
                    "parse_status": "ok",
                }
            ],
            "next_cursor": "cursor-3",
        }
        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/samples",
            params={
                "project_id": PROJECT_ID,
                "search": "contract",
                "has_setup": False,
                "has_sandbox": True,
                "has_files": False,
                "parse_status": "ok",
                "limit": 50,
                "offset": 0,
            },
        )

    assert response.status_code == 200
    assert response.json()["items"][0]["sample_id"] == SAMPLE_ID
    assert response.json()["next_cursor"] == "cursor-3"
    mock_samples.assert_called_once_with(
        user_id="user-1",
        project_id=PROJECT_ID,
        dataset_id=DATASET_ID,
        dataset_version_id=VERSION_ID,
        search="contract",
        has_setup=False,
        has_sandbox=True,
        has_files=False,
        parse_status="ok",
        limit=50,
        cursor=None,
        offset=0,
    )


def test_get_dataset_sample_detail_returns_contract(client):
    with patch("app.api.routes.agchain_datasets.get_dataset_sample_detail") as mock_sample:
        mock_sample.return_value = {
            "sample_id": SAMPLE_ID,
            "canonical_sample_json": {
                "input": "Summarize the contract.",
                "target": "A short summary",
                "metadata": {"difficulty": "medium"},
            },
            "metadata_json": {"difficulty": "medium", "source": "synthetic"},
            "setup": None,
            "sandbox": {"profile": "python"},
            "files": [],
        }
        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/samples/{SAMPLE_ID}"
        )

    assert response.status_code == 200
    assert response.json()["sample_id"] == SAMPLE_ID
    assert response.json()["sandbox"] == {"profile": "python"}


def test_list_datasets_rejects_cross_project_access(client):
    admin = _DatasetRegistryAdmin(
        tables={
            "user_projects": [
                {"project_id": PROJECT_ID, "organization_id": "org-1"},
                {"project_id": "project-2", "organization_id": "org-1"},
            ],
            "agchain_project_memberships": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": "org-1",
                    "user_id": "user-1",
                    "membership_role": "project_admin",
                    "membership_status": "active",
                }
            ],
            "agchain_organization_members": [
                {
                    "organization_id": "org-1",
                    "user_id": "user-1",
                    "membership_role": "organization_member",
                    "membership_status": "active",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
    ):
        response = client.get("/agchain/datasets", params={"project_id": "project-2"})

    assert response.status_code == 403


def test_get_dataset_bootstrap_rejects_cross_project_access_when_project_id_is_supplied(client):
    admin = _DatasetRegistryAdmin(
        tables={
            "user_projects": [
                {"project_id": PROJECT_ID, "organization_id": "org-1"},
                {"project_id": "project-2", "organization_id": "org-1"},
            ],
            "agchain_project_memberships": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": "org-1",
                    "user_id": "user-1",
                    "membership_role": "project_admin",
                    "membership_status": "active",
                }
            ],
        }
    )

    with patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin):
        response = client.get("/agchain/datasets/new/bootstrap", params={"project_id": "project-2"})

    assert response.status_code == 403


def test_get_dataset_detail_rejects_cross_project_access(client):
    admin = _DatasetRegistryAdmin(
        tables={
            "user_projects": [
                {"project_id": PROJECT_ID, "organization_id": "org-1"},
                {"project_id": "project-2", "organization_id": "org-1"},
            ],
            "agchain_project_memberships": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": "org-1",
                    "user_id": "user-1",
                    "membership_role": "project_admin",
                    "membership_status": "active",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
    ):
        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/detail",
            params={"project_id": "project-2"},
        )

    assert response.status_code == 403


def test_get_dataset_version_source_rejects_cross_project_access(client):
    admin = _DatasetRegistryAdmin(
        tables={
            "user_projects": [
                {"project_id": PROJECT_ID, "organization_id": "org-1"},
                {"project_id": "project-2", "organization_id": "org-1"},
            ],
            "agchain_project_memberships": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": "org-1",
                    "user_id": "user-1",
                    "membership_role": "project_admin",
                    "membership_status": "active",
                }
            ],
            "agchain_datasets": [
                {"dataset_id": DATASET_ID, "project_id": "project-2"},
            ],
            "agchain_dataset_versions": [
                {"dataset_version_id": VERSION_ID, "dataset_id": DATASET_ID},
            ],
        }
    )

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
    ):
        response = client.get(f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/source")

    assert response.status_code == 403


def test_get_dataset_sample_detail_rejects_cross_project_access(client):
    admin = _DatasetRegistryAdmin(
        tables={
            "user_projects": [
                {"project_id": PROJECT_ID, "organization_id": "org-1"},
                {"project_id": "project-2", "organization_id": "org-1"},
            ],
            "agchain_project_memberships": [
                {
                    "project_id": PROJECT_ID,
                    "organization_id": "org-1",
                    "user_id": "user-1",
                    "membership_role": "project_admin",
                    "membership_status": "active",
                }
            ],
            "agchain_datasets": [
                {"dataset_id": DATASET_ID, "project_id": "project-2"},
            ],
            "agchain_dataset_versions": [
                {"dataset_version_id": VERSION_ID, "dataset_id": DATASET_ID},
            ],
        }
    )

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
    ):
        response = client.get(
            f"/agchain/datasets/{DATASET_ID}/versions/{VERSION_ID}/samples/{SAMPLE_ID}"
        )

    assert response.status_code == 403


def test_preview_dataset_source_normalizes_sandbox_files_and_setup():
    with patch(
        "app.domain.agchain.inspect_dataset_materializer._load_source_records",
        return_value=[
            {
                "prompt": "Summarize the contract.",
                "answer": "A short summary",
                "metadata": {"difficulty": "medium"},
                "sandbox": {"profile": "python"},
                "files": [{"name": "contract.txt"}],
                "setup": {"cwd": "/tmp/task"},
            }
        ],
    ):
        preview = preview_dataset_source(
            source_type="jsonl",
            source_uri="gs://bucket/legal.jsonl",
            source_upload_id=None,
            source_config_jsonb=_new_preview_body()["source_config_jsonb"],
            field_spec_jsonb=_new_preview_body()["field_spec_jsonb"],
            materialization_options_jsonb=_new_preview_body()["materialization_options_jsonb"],
        )

    assert preview["sample_count"] == 1
    assert preview["preview_samples"][0]["sandbox"] == {"profile": "python"}
    assert preview["preview_samples"][0]["files"] == [{"name": "contract.txt"}]
    assert preview["preview_samples"][0]["setup"] == {"cwd": "/tmp/task"}
    assert preview["validation_summary"]["validation_status"] == "pass"


def test_create_dataset_persists_dataset_version_samples_and_validation():
    admin = _DatasetRegistryAdmin(tables=_authorized_tables())

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.dataset_registry.preview_dataset_source_materializer",
            return_value={**_preview_payload(), "parse_summary_jsonb": {"field_resolution_summary": {}}},
        ),
    ):
        result = create_dataset(
            user_id="user-1",
            payload={
                **_new_preview_body(),
                "name": "Legal QA",
                "slug": "legal-qa",
                "description": "Legal evaluation samples.",
                "tags": ["legal"],
                "initial_version_label": "v1",
            },
        )

    assert result["dataset"]["slug"] == "legal-qa"
    assert len(admin.tables["agchain_datasets"]) == 1
    assert len(admin.tables["agchain_dataset_versions"]) == 1
    assert len(admin.tables["agchain_dataset_samples"]) == 1
    assert len(admin.tables["agchain_dataset_version_validations"]) == 1
    dataset_row = admin.tables["agchain_datasets"][0]
    version_row = admin.tables["agchain_dataset_versions"][0]
    sample_row = admin.tables["agchain_dataset_samples"][0]
    validation_row = admin.tables["agchain_dataset_version_validations"][0]
    assert dataset_row["latest_version_id"] == version_row["dataset_version_id"]
    assert sample_row["has_sandbox"] is True
    assert sample_row["has_files"] is True
    assert sample_row["has_setup"] is True
    assert validation_row["validation_status"] == "pass"


def test_preview_dataset_version_returns_persisted_preview_when_refresh_is_false():
    admin = _DatasetRegistryAdmin(
        tables={
            **_authorized_tables(),
            "agchain_datasets": [
                {
                    "dataset_id": DATASET_ID,
                    "project_id": PROJECT_ID,
                    "slug": "legal-qa",
                    "name": "Legal QA",
                    "description": "",
                    "tags_jsonb": [],
                    "status": "active",
                    "source_type": "jsonl",
                    "latest_version_id": VERSION_ID,
                    "updated_at": "2026-04-01T07:00:00Z",
                }
            ],
            "agchain_dataset_versions": [
                {
                    "dataset_version_id": VERSION_ID,
                    "dataset_id": DATASET_ID,
                    "version_label": "v1",
                    "base_version_id": None,
                    "source_type": "jsonl",
                    "source_uri": "gs://bucket/legal.jsonl",
                    "source_config_jsonb": _new_preview_body()["source_config_jsonb"],
                    "field_spec_jsonb": _new_preview_body()["field_spec_jsonb"],
                    "materialization_options_jsonb": _new_preview_body()["materialization_options_jsonb"],
                    "parse_summary_jsonb": {"field_resolution_summary": {"resolved_fields": ["input", "target"]}},
                    "validation_summary_jsonb": _preview_payload()["validation_summary"],
                    "sample_count": 1,
                    "checksum": "sha256:preview-1",
                    "created_at": "2026-04-01T07:00:00Z",
                    "updated_at": "2026-04-01T07:00:00Z",
                }
            ],
            "agchain_dataset_samples": [
                {
                    "dataset_sample_id": "dataset-sample-1",
                    "dataset_version_id": VERSION_ID,
                    "sample_id": SAMPLE_ID,
                    "canonical_sample_jsonb": _preview_payload()["preview_samples"][0],
                    "summary_jsonb": {
                        "input_preview": "Summarize the contract.",
                        "target_preview": "A short summary",
                        "choice_count": 0,
                        "metadata_summary": {"difficulty": "medium"},
                    },
                    "metadata_jsonb": {"difficulty": "medium"},
                    "has_setup": True,
                    "has_sandbox": True,
                    "has_files": True,
                    "parse_status": "ok",
                }
            ],
            "agchain_dataset_version_validations": [
                {
                    "dataset_version_validation_id": "validation-1",
                    "dataset_version_id": VERSION_ID,
                    "source_hash": "sha256:preview-1",
                    "validation_status": "pass",
                    "issue_groups_jsonb": [],
                    "warning_count": 0,
                    "duplicate_id_count": 0,
                    "missing_field_count": 0,
                    "unsupported_payload_count": 0,
                    "generated_at": "2026-04-01T07:00:00Z",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
    ):
        result = preview_dataset_version(
            user_id="user-1",
            dataset_id=DATASET_ID,
            dataset_version_id=VERSION_ID,
            payload={"refresh": False},
        )

    assert result["dataset_version_id"] == VERSION_ID
    assert result["preview_samples"][0]["sandbox"] == {"profile": "python"}


def test_dataset_version_draft_lifecycle_persists_and_commits_new_version():
    admin = _DatasetRegistryAdmin(
        tables={
            **_authorized_tables(),
            "agchain_datasets": [
                {
                    "dataset_id": DATASET_ID,
                    "project_id": PROJECT_ID,
                    "slug": "legal-qa",
                    "name": "Legal QA",
                    "description": "",
                    "tags_jsonb": [],
                    "status": "active",
                    "source_type": "jsonl",
                    "latest_version_id": VERSION_ID,
                    "updated_at": "2026-04-01T07:00:00Z",
                }
            ],
            "agchain_dataset_versions": [
                {
                    "dataset_version_id": VERSION_ID,
                    "dataset_id": DATASET_ID,
                    "version_label": "v1",
                    "base_version_id": None,
                    "source_type": "jsonl",
                    "source_uri": "gs://bucket/legal.jsonl",
                    "source_config_jsonb": _new_preview_body()["source_config_jsonb"],
                    "field_spec_jsonb": _new_preview_body()["field_spec_jsonb"],
                    "materialization_options_jsonb": _new_preview_body()["materialization_options_jsonb"],
                    "parse_summary_jsonb": {"field_resolution_summary": {"resolved_fields": ["input", "target"]}},
                    "validation_summary_jsonb": _preview_payload()["validation_summary"],
                    "sample_count": 1,
                    "checksum": "sha256:preview-1",
                    "created_by": "user-1",
                    "created_at": "2026-04-01T07:00:00Z",
                    "updated_at": "2026-04-01T07:00:00Z",
                }
            ],
        }
    )

    with (
        patch("app.domain.agchain.dataset_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.project_access.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.dataset_registry.preview_dataset_draft_materializer",
            return_value={**_preview_payload(), "parse_summary_jsonb": {"field_resolution_summary": {}}},
        ),
    ):
        created = create_dataset_version_draft(
            user_id="user-1",
            dataset_id=DATASET_ID,
            payload={"base_version_id": VERSION_ID},
        )
        draft_id = created["draft"]["draft_id"]

        updated = update_dataset_version_draft(
            user_id="user-1",
            dataset_id=DATASET_ID,
            draft_id=draft_id,
            payload={"version_label": "v2", "materialization_options_jsonb": {"limit": 1}},
        )
        reloaded = get_dataset_version_draft(user_id="user-1", dataset_id=DATASET_ID, draft_id=draft_id)
        committed = commit_dataset_version_draft(
            user_id="user-1",
            dataset_id=DATASET_ID,
            draft_id=draft_id,
            payload={"commit_message": "Publish v2"},
        )

    assert updated["draft"]["version_label"] == "v2"
    assert reloaded["draft_id"] == draft_id
    assert committed["version"]["base_version_id"] == VERSION_ID
    assert len(admin.tables["agchain_dataset_versions"]) == 2
    assert len(admin.tables["agchain_dataset_samples"]) == 1
    draft_row = admin.tables["agchain_dataset_version_drafts"][0]
    assert draft_row["draft_status"] == "committed"
    assert draft_row["dirty_state_jsonb"]["committed_version_id"] == committed["version"]["dataset_version_id"]
