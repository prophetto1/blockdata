from unittest.mock import patch

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


def test_list_benchmarks_returns_catalog_rows(client):
    with patch("app.api.routes.agchain_benchmarks.list_benchmarks") as mock_list:
        mock_list.return_value = [
            {
                "benchmark_id": "benchmark-1",
                "benchmark_slug": "legal-10",
                "benchmark_name": "Legal-10",
                "description": "Three-step benchmark package for legal analysis.",
                "state": "draft",
                "current_spec_label": "draft v0.1.0",
                "current_spec_version": "v0.1.0",
                "version_status": "draft",
                "step_count": 3,
                "selected_eval_model_count": 2,
                "tested_model_count": 0,
                "tested_policy_bundle_count": 0,
                "validation_status": "warn",
                "validation_issue_count": 2,
                "last_run_at": None,
                "updated_at": "2026-03-27T08:15:00Z",
                "href": "/app/agchain/benchmarks/legal-10#steps",
            }
        ]

        response = client.get("/agchain/benchmarks")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["benchmark_slug"] == "legal-10"
    assert body["items"][0]["benchmark_name"] == "Legal-10"


def test_list_benchmarks_applies_filters_and_returns_empty_state(client):
    with patch("app.api.routes.agchain_benchmarks.list_benchmarks") as mock_list:
        mock_list.return_value = [
            {
                "benchmark_id": "benchmark-1",
                "benchmark_slug": "legal-10",
                "benchmark_name": "Legal-10",
                "description": "Three-step benchmark package for legal analysis.",
                "state": "draft",
                "current_spec_label": "draft v0.1.0",
                "current_spec_version": "v0.1.0",
                "version_status": "draft",
                "step_count": 3,
                "selected_eval_model_count": 2,
                "tested_model_count": 0,
                "tested_policy_bundle_count": 0,
                "validation_status": "warn",
                "validation_issue_count": 2,
                "last_run_at": None,
                "updated_at": "2026-03-27T08:15:00Z",
                "href": "/app/agchain/benchmarks/legal-10#steps",
            },
            {
                "benchmark_id": "benchmark-2",
                "benchmark_slug": "finance-5",
                "benchmark_name": "Finance-5",
                "description": "Finance benchmark package.",
                "state": "ready",
                "current_spec_label": "published v1.0.0",
                "current_spec_version": "v1.0.0",
                "version_status": "published",
                "step_count": 5,
                "selected_eval_model_count": 1,
                "tested_model_count": 1,
                "tested_policy_bundle_count": 0,
                "validation_status": "pass",
                "validation_issue_count": 0,
                "last_run_at": "2026-03-26T22:00:00Z",
                "updated_at": "2026-03-27T07:15:00Z",
                "href": "/app/agchain/benchmarks/finance-5#steps",
            },
        ]

        filtered_response = client.get(
            "/agchain/benchmarks",
            params={"search": "legal", "state": "draft", "validation_status": "warn"},
        )
        empty_response = client.get("/agchain/benchmarks", params={"search": "missing"})

    assert filtered_response.status_code == 200
    assert [item["benchmark_slug"] for item in filtered_response.json()["items"]] == ["legal-10"]
    assert empty_response.status_code == 200
    assert empty_response.json() == {"items": []}


def test_create_benchmark_requires_superuser(client):
    response = client.post(
        "/agchain/benchmarks",
        json={
            "benchmark_name": "Legal-10",
            "benchmark_slug": "legal-10",
            "description": "Three-step benchmark package for legal analysis.",
        },
    )

    assert response.status_code == 403


def test_create_benchmark_creates_identity_and_initial_draft(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.create_benchmark") as mock_create:
        mock_create.return_value = {
            "benchmark_id": "benchmark-1",
            "benchmark_slug": "legal-10",
            "benchmark_version_id": "version-1",
            "redirect_path": "/app/agchain/benchmarks/legal-10#steps",
        }

        response = superuser_client.post(
            "/agchain/benchmarks",
            json={
                "benchmark_name": "Legal-10",
                "benchmark_slug": "legal-10",
                "description": "Three-step benchmark package for legal analysis.",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "benchmark_id": "benchmark-1",
        "benchmark_slug": "legal-10",
        "benchmark_version_id": "version-1",
        "redirect_path": "/app/agchain/benchmarks/legal-10#steps",
    }


def test_get_benchmark_returns_current_version_summary(client):
    with patch("app.api.routes.agchain_benchmarks.get_benchmark_summary") as mock_get:
        mock_get.return_value = {
            "benchmark": {
                "benchmark_id": "benchmark-1",
                "benchmark_slug": "legal-10",
                "benchmark_name": "Legal-10",
                "description": "Three-step benchmark package for legal analysis.",
            },
            "current_version": {
                "benchmark_version_id": "version-1",
                "version_label": "v0.1.0",
                "version_status": "draft",
                "plan_family": "custom",
                "step_count": 3,
                "validation_status": "warn",
                "validation_issue_count": 2,
            },
            "permissions": {"can_edit": True},
            "counts": {
                "selected_eval_model_count": 2,
                "tested_model_count": 1,
            },
        }

        response = client.get("/agchain/benchmarks/legal-10")

    assert response.status_code == 200
    body = response.json()
    assert body["benchmark"]["benchmark_slug"] == "legal-10"
    assert body["current_version"]["version_status"] == "draft"
    mock_get.assert_called_once_with(user_id="user-1", benchmark_slug="legal-10")


def test_get_benchmark_steps_returns_sorted_rows(client):
    with patch("app.api.routes.agchain_benchmarks.get_benchmark_steps") as mock_get_steps:
        mock_get_steps.return_value = {
            "benchmark": {
                "benchmark_id": "benchmark-1",
                "benchmark_slug": "legal-10",
                "benchmark_name": "Legal-10",
                "description": "Three-step benchmark package for legal analysis.",
            },
            "current_version": {
                "benchmark_version_id": "version-1",
                "version_label": "v0.1.0",
                "version_status": "draft",
                "plan_family": "custom",
                "step_count": 2,
                "validation_status": "warn",
                "validation_issue_count": 2,
            },
            "can_edit": True,
            "steps": [
                {
                    "benchmark_step_id": "step-1",
                    "step_order": 1,
                    "step_id": "d1",
                    "display_name": "Issue Spotting",
                    "step_kind": "model",
                    "api_call_boundary": "own_call",
                    "inject_payloads": ["p1"],
                    "scoring_mode": "none",
                    "output_contract": "irac_outline_v1",
                    "scorer_ref": None,
                    "judge_prompt_ref": None,
                    "judge_grades_step_ids": [],
                    "enabled": True,
                    "step_config": {"system_prompt_ref": "issue_spotting_v1"},
                    "updated_at": "2026-03-27T08:15:00Z",
                },
                {
                    "benchmark_step_id": "step-2",
                    "step_order": 2,
                    "step_id": "j3",
                    "display_name": "Judge Pair",
                    "step_kind": "judge",
                    "api_call_boundary": "own_call",
                    "inject_payloads": [],
                    "scoring_mode": "judge",
                    "output_contract": "judge_pair_v1",
                    "scorer_ref": None,
                    "judge_prompt_ref": "irac_mee_pair_v1",
                    "judge_grades_step_ids": ["d1", "d2"],
                    "enabled": True,
                    "step_config": {"temperature": 0},
                    "updated_at": "2026-03-27T08:20:00Z",
                },
            ],
        }

        response = client.get("/agchain/benchmarks/legal-10/steps")

    assert response.status_code == 200
    body = response.json()
    assert [step["step_order"] for step in body["steps"]] == [1, 2]
    assert body["steps"][0]["step_id"] == "d1"
    mock_get_steps.assert_called_once_with(user_id="user-1", benchmark_slug="legal-10")


def test_create_benchmark_step_requires_superuser(client):
    response = client.post(
        "/agchain/benchmarks/legal-10/steps",
        json={
            "step_id": "d2",
            "display_name": "Rule Synthesis",
            "step_kind": "model",
            "api_call_boundary": "continue_call",
            "inject_payloads": ["p2"],
            "scoring_mode": "deterministic",
            "output_contract": "irac_rule_v1",
            "scorer_ref": "irac_rule_scorer_v1",
            "judge_prompt_ref": None,
            "judge_grades_step_ids": [],
            "enabled": True,
            "step_config": {"system_prompt_ref": "rule_synthesis_v1"},
        },
    )

    assert response.status_code == 403


def test_create_benchmark_step_appends_to_draft_version(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.create_benchmark_step") as mock_create_step:
        mock_create_step.return_value = {
            "benchmark_step_id": "step-3",
            "step_order": 3,
        }

        response = superuser_client.post(
            "/agchain/benchmarks/legal-10/steps",
            json={
                "step_id": "d2",
                "display_name": "Rule Synthesis",
                "step_kind": "model",
                "api_call_boundary": "continue_call",
                "inject_payloads": ["p2"],
                "scoring_mode": "deterministic",
                "output_contract": "irac_rule_v1",
                "scorer_ref": "irac_rule_scorer_v1",
                "judge_prompt_ref": None,
                "judge_grades_step_ids": [],
                "enabled": True,
                "step_config": {"system_prompt_ref": "rule_synthesis_v1"},
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "benchmark_step_id": "step-3",
        "step_order": 3,
    }
    mock_create_step.assert_called_once()
    assert mock_create_step.call_args.kwargs["benchmark_slug"] == "legal-10"
    assert mock_create_step.call_args.kwargs["user_id"] == "user-1"


def test_update_benchmark_step_requires_superuser(client):
    response = client.patch(
        "/agchain/benchmarks/legal-10/steps/step-1",
        json={
            "display_name": "Updated Issue Spotting",
            "enabled": False,
            "step_config": {"system_prompt_ref": "issue_spotting_v2"},
        },
    )

    assert response.status_code == 403


def test_update_benchmark_step_updates_current_draft_step(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.update_benchmark_step") as mock_update_step:
        mock_update_step.return_value = {"benchmark_step_id": "step-1"}

        response = superuser_client.patch(
            "/agchain/benchmarks/legal-10/steps/step-1",
            json={
                "display_name": "Updated Issue Spotting",
                "enabled": False,
                "step_config": {"system_prompt_ref": "issue_spotting_v2"},
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "benchmark_step_id": "step-1"}
    mock_update_step.assert_called_once()
    assert mock_update_step.call_args.kwargs["benchmark_step_id"] == "step-1"


def test_reorder_benchmark_steps_requires_superuser(client):
    response = client.post(
        "/agchain/benchmarks/legal-10/steps/reorder",
        json={"ordered_step_ids": ["step-2", "step-1", "step-3"]},
    )

    assert response.status_code == 403


def test_reorder_benchmark_steps_rewrites_dense_order(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.reorder_benchmark_steps") as mock_reorder:
        mock_reorder.return_value = {"step_count": 3}

        response = superuser_client.post(
            "/agchain/benchmarks/legal-10/steps/reorder",
            json={"ordered_step_ids": ["step-2", "step-1", "step-3"]},
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "step_count": 3}
    mock_reorder.assert_called_once_with(
        user_id="user-1",
        benchmark_slug="legal-10",
        ordered_step_ids=["step-2", "step-1", "step-3"],
    )


def test_delete_benchmark_step_requires_superuser(client):
    response = client.delete("/agchain/benchmarks/legal-10/steps/step-3")

    assert response.status_code == 403


def test_delete_benchmark_step_compacts_order(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.delete_benchmark_step") as mock_delete:
        mock_delete.return_value = {"deleted_step_id": "step-3"}

        response = superuser_client.delete("/agchain/benchmarks/legal-10/steps/step-3")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "deleted_step_id": "step-3"}
    mock_delete.assert_called_once_with(
        user_id="user-1",
        benchmark_slug="legal-10",
        benchmark_step_id="step-3",
    )
