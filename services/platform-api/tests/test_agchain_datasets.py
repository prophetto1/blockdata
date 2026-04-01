from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_superuser, require_user_auth
from app.auth.principals import AuthPrincipal
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
