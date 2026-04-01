from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_superuser, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.benchmark_registry import create_benchmark, list_benchmarks, reorder_benchmark_steps
from app.main import create_app


MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


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


def test_list_benchmarks_returns_child_rows(client):
    with patch("app.api.routes.agchain_benchmarks.list_benchmarks") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "benchmark_id": "benchmark-1",
                    "project_id": "project-1",
                    "benchmark_slug": "legal-10",
                    "benchmark_name": "Legal-10",
                    "description": "Three-step benchmark package for legal analysis.",
                    "latest_version_id": "version-1",
                    "latest_version_label": "v0.1.0",
                    "dataset_version_id": None,
                    "scorer_count": 2,
                    "tool_count": 1,
                    "status": "draft",
                    "validation_status": "warn",
                    "updated_at": "2026-03-27T08:15:00Z",
                }
            ],
            "next_cursor": "cursor-2",
        }

        response = client.get(
            "/agchain/benchmarks",
            params={"project_id": "project-1", "limit": 25, "offset": 0},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["benchmark_slug"] == "legal-10"
    assert body["items"][0]["project_id"] == "project-1"
    assert body["next_cursor"] == "cursor-2"


def test_list_benchmarks_passes_query_filters(client):
    with patch("app.api.routes.agchain_benchmarks.list_benchmarks") as mock_list:
        mock_list.return_value = {"items": [], "next_cursor": None}

        response = client.get(
            "/agchain/benchmarks",
            params={
                "project_id": "project-1",
                "search": "legal",
                "state": "draft",
                "validation_status": "warn",
                "has_active_runs": False,
                "limit": 25,
                "offset": 0,
            },
        )

    assert response.status_code == 200
    assert response.json() == {"items": [], "next_cursor": None}


def test_create_benchmark_requires_project_id(client):
    response = client.post(
        "/agchain/benchmarks",
        json={
            "benchmark_name": "Legal-10",
            "benchmark_slug": "legal-10",
            "description": "Three-step benchmark package for legal analysis.",
        },
    )

    assert response.status_code == 422


def test_create_benchmark_creates_identity_and_initial_draft(client):
    with patch("app.api.routes.agchain_benchmarks.create_benchmark") as mock_create:
        mock_create.return_value = {
            "benchmark_id": "benchmark-1",
            "benchmark_slug": "legal-10",
            "benchmark_version_id": "version-1",
            "redirect_path": "/app/agchain/benchmarks/legal-10#steps",
        }

        response = client.post(
            "/agchain/benchmarks",
            json={
                "project_id": "project-1",
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
    assert mock_create.call_args.kwargs["user_id"] == "user-1"
    assert mock_create.call_args.kwargs["payload"]["project_id"] == "project-1"


def test_get_benchmark_returns_current_version_summary(client):
    with patch("app.api.routes.agchain_benchmarks.get_benchmark_summary") as mock_get:
        mock_get.return_value = {
            "benchmark": {
                "benchmark_id": "benchmark-1",
                "project_id": "project-1",
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
                "project_id": "project-1",
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


def test_create_benchmark_step_appends_to_draft_version(client):
    with patch("app.api.routes.agchain_benchmarks.create_benchmark_step") as mock_create_step:
        mock_create_step.return_value = {
            "benchmark_step_id": "step-3",
            "step_order": 3,
        }

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

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "benchmark_step_id": "step-3",
        "step_order": 3,
    }
    assert mock_create_step.call_args.kwargs["benchmark_slug"] == "legal-10"
    assert mock_create_step.call_args.kwargs["user_id"] == "user-1"


def test_update_benchmark_step_updates_current_draft_step(client):
    with patch("app.api.routes.agchain_benchmarks.update_benchmark_step") as mock_update_step:
        mock_update_step.return_value = {"benchmark_step_id": "step-1"}

        response = client.patch(
            "/agchain/benchmarks/legal-10/steps/step-1",
            json={
                "display_name": "Updated Issue Spotting",
                "enabled": False,
                "step_config": {"system_prompt_ref": "issue_spotting_v2"},
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "benchmark_step_id": "step-1"}
    assert mock_update_step.call_args.kwargs["benchmark_step_id"] == "step-1"


def test_reorder_benchmark_steps_rewrites_dense_order(client):
    with patch("app.api.routes.agchain_benchmarks.reorder_benchmark_steps") as mock_reorder:
        mock_reorder.return_value = {"step_count": 3}

        response = client.post(
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


def test_delete_benchmark_step_compacts_order(client):
    with patch("app.api.routes.agchain_benchmarks.delete_benchmark_step") as mock_delete:
        mock_delete.return_value = {"deleted_step_id": "step-3"}

        response = client.delete("/agchain/benchmarks/legal-10/steps/step-3")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "deleted_step_id": "step-3"}
    mock_delete.assert_called_once_with(
        user_id="user-1",
        benchmark_slug="legal-10",
        benchmark_step_id="step-3",
    )


class _RegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._in_filters: dict[str, set[object]] = {}
        self._operation = "select"
        self._payload = None
        self._maybe_single = False

    def select(self, *_args, **_kwargs):
        self._operation = "select"
        return self

    def eq(self, key, value):
        self._filters[key] = value
        return self

    def in_(self, key, values):
        self._in_filters[key] = set(values)
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
        self._admin.calls.append((self._table_name, self._operation, dict(self._filters), dict(self._in_filters)))

        if self._operation == "insert":
            if self._table_name == "agchain_benchmarks" and self._admin.raise_duplicate_slug:
                raise Exception('duplicate key value violates unique constraint "agchain_benchmarks_owner_user_id_benchmark_slug_key"')
            return type("R", (), {"data": self._admin.insert_results.get(self._table_name, [])})()

        if self._operation == "update":
            self._admin.update_calls.append((self._table_name, self._payload, dict(self._filters)))
            return type("R", (), {"data": []})()

        rows = list(self._admin.tables.get(self._table_name, []))
        rows = [
            row
            for row in rows
            if all(row.get(key) == value for key, value in self._filters.items())
            and all(row.get(key) in values for key, values in self._in_filters.items())
        ]
        data = rows[0] if self._maybe_single and rows else (None if self._maybe_single else rows)
        return type("R", (), {"data": data})()


class _RegistryAdmin:
    def __init__(self, *, tables=None, insert_results=None, raise_duplicate_slug=False):
        self.tables = tables or {}
        self.insert_results = insert_results or {}
        self.raise_duplicate_slug = raise_duplicate_slug
        self.calls: list[tuple[str, str, dict[str, object], dict[str, set[object]]]] = []
        self.update_calls: list[tuple[str, object, dict[str, object]]] = []
        self.rpc_calls: list[tuple[str, dict[str, object]]] = []

    def table(self, name):
        return _RegistryQuery(self, name)

    def rpc(self, name, payload):
        self.rpc_calls.append((name, payload))
        return type("Exec", (), {"execute": lambda self_exec: type("R", (), {"data": {"step_count": len(payload.get("p_ordered_step_ids", []))}})()})()


def test_list_benchmarks_batches_scorer_counts():
    admin = _RegistryAdmin(
        tables={
            "agchain_benchmarks": [
                {
                    "benchmark_id": "benchmark-1",
                    "project_id": "project-1",
                    "benchmark_slug": "legal-10",
                    "benchmark_name": "Legal-10",
                    "description": "Legal analysis benchmark.",
                    "current_draft_version_id": "version-1",
                    "current_published_version_id": None,
                    "updated_at": "2026-03-27T08:15:00Z",
                },
                {
                    "benchmark_id": "benchmark-2",
                    "project_id": "project-2",
                    "benchmark_slug": "finance-5",
                    "benchmark_name": "Finance-5",
                    "description": "Finance analysis benchmark.",
                    "current_draft_version_id": "version-2",
                    "current_published_version_id": None,
                    "updated_at": "2026-03-27T07:15:00Z",
                },
            ],
            "agchain_benchmark_versions": [
                {
                    "benchmark_version_id": "version-1",
                    "benchmark_id": "benchmark-1",
                    "version_label": "v0.1.0",
                    "version_status": "draft",
                    "plan_family": "custom",
                    "step_count": 3,
                    "validation_status": "warn",
                    "validation_issue_count": 2,
                },
                {
                    "benchmark_version_id": "version-2",
                    "benchmark_id": "benchmark-2",
                    "version_label": "v0.1.0",
                    "version_status": "draft",
                    "plan_family": "custom",
                    "step_count": 5,
                    "validation_status": "pass",
                    "validation_issue_count": 0,
                },
            ],
            "agchain_runs": [],
            "agchain_benchmark_steps": [
                {"benchmark_version_id": "version-1", "scorer_ref": "scorer-a"},
                {"benchmark_version_id": "version-1", "scorer_ref": "scorer-b"},
                {"benchmark_version_id": "version-1", "scorer_ref": None},
                {"benchmark_version_id": "version-2", "scorer_ref": "scorer-c"},
            ],
        }
    )

    with (
        patch("app.domain.agchain.benchmark_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.benchmark_registry.load_accessible_projects",
            return_value=[
                {"project_id": "project-1", "membership_role": "project_admin"},
                {"project_id": "project-2", "membership_role": "project_viewer"},
            ],
        ),
    ):
        payload = list_benchmarks(
            user_id="user-1",
            project_id=None,
            search=None,
            state=None,
            validation_status=None,
            has_active_runs=None,
            limit=50,
            cursor=None,
            offset=0,
        )

    assert [item["scorer_count"] for item in payload["items"]] == [2, 1]
    assert [call[0] for call in admin.calls].count("agchain_benchmark_steps") == 1


def test_create_benchmark_returns_conflict_for_duplicate_slug():
    admin = _RegistryAdmin(raise_duplicate_slug=True)

    with (
        patch("app.domain.agchain.benchmark_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.benchmark_registry.require_project_write_access",
            return_value={"project_id": "project-1", "membership_role": "project_admin"},
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            create_benchmark(
                user_id="user-1",
                payload={
                    "project_id": "project-1",
                    "benchmark_name": "Legal-10",
                    "benchmark_slug": "legal-10",
                    "description": "Legal analysis benchmark.",
                },
            )

    assert exc.value.status_code == 409
    assert exc.value.detail == "Benchmark slug already exists"


def test_reorder_benchmark_steps_uses_atomic_rpc():
    admin = _RegistryAdmin(
        tables={
            "agchain_benchmarks": [
                {
                    "benchmark_id": "benchmark-1",
                    "project_id": "project-1",
                    "benchmark_slug": "legal-10",
                    "benchmark_name": "Legal-10",
                    "current_draft_version_id": "version-1",
                    "current_published_version_id": None,
                }
            ],
            "agchain_benchmark_versions": [
                {
                    "benchmark_version_id": "version-1",
                    "benchmark_id": "benchmark-1",
                    "version_status": "draft",
                }
            ],
            "agchain_benchmark_steps": [
                {"benchmark_step_id": "step-1", "benchmark_version_id": "version-1", "step_order": 1},
                {"benchmark_step_id": "step-2", "benchmark_version_id": "version-1", "step_order": 2},
                {"benchmark_step_id": "step-3", "benchmark_version_id": "version-1", "step_order": 3},
            ],
        }
    )

    with (
        patch("app.domain.agchain.benchmark_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.benchmark_registry.require_project_write_access",
            return_value={"project_id": "project-1", "membership_role": "project_admin"},
        ),
    ):
        result = reorder_benchmark_steps(
            user_id="user-1",
            benchmark_slug="legal-10",
            ordered_step_ids=["step-2", "step-1", "step-3"],
        )

    assert result == {"step_count": 3}
    assert len(admin.rpc_calls) == 1
    rpc_name, rpc_payload = admin.rpc_calls[0]
    assert rpc_name == "reorder_agchain_benchmark_steps_atomic"
    assert rpc_payload["p_benchmark_version_id"] == "version-1"
    assert rpc_payload["p_ordered_step_ids"] == ["step-2", "step-1", "step-3"]
    assert isinstance(rpc_payload["p_updated_at"], str)
    assert [call[0] for call in admin.update_calls if call[0] == "agchain_benchmark_steps"] == []


def test_benchmark_reorder_atomic_rpc_migration_exists():
    matches = sorted(MIGRATIONS_DIR.glob("*_agchain_benchmark_step_reorder_atomic_rpc.sql"))
    assert len(matches) == 1

    normalized = " ".join(matches[0].read_text(encoding="utf-8").split())
    assert "CREATE OR REPLACE FUNCTION public.reorder_agchain_benchmark_steps_atomic(" in normalized
    assert "ordered_step_ids must contain each step exactly once" in normalized


def test_component_registries_migration_exists_with_user_project_fks():
    matches = sorted(MIGRATIONS_DIR.glob("*_agchain_inspect_component_registries.sql"))
    assert len(matches) == 1

    normalized = " ".join(matches[0].read_text(encoding="utf-8").split())
    assert "CREATE TABLE IF NOT EXISTS public.agchain_scorers (" in normalized
    assert "CREATE TABLE IF NOT EXISTS public.agchain_tools (" in normalized
    assert "CREATE TABLE IF NOT EXISTS public.agchain_sandbox_profiles (" in normalized
    assert "CREATE TABLE IF NOT EXISTS public.agchain_benchmark_version_scorers (" in normalized
    assert "CREATE TABLE IF NOT EXISTS public.agchain_benchmark_version_tools (" in normalized
    assert "REFERENCES public.user_projects(project_id) ON DELETE CASCADE" in normalized
    assert "ADD COLUMN IF NOT EXISTS task_definition_jsonb JSONB" in normalized
    assert "ADD COLUMN IF NOT EXISTS validation_summary_jsonb JSONB" in normalized


def test_list_benchmark_versions_returns_paged_rows(client):
    with patch("app.api.routes.agchain_benchmarks.list_benchmark_versions") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "benchmark_version_id": "version-2",
                    "version_label": "v0.2.0",
                    "version_status": "draft",
                    "dataset_version_id": "dataset-version-2",
                    "validation_status": "warn",
                    "scorer_count": 2,
                    "tool_count": 1,
                    "created_at": "2026-03-31T10:00:00Z",
                    "updated_at": "2026-03-31T10:30:00Z",
                }
            ],
            "next_cursor": "cursor-2",
        }

        response = client.get(
            "/agchain/benchmarks/legal-10/versions",
            params={"limit": 10, "cursor": "cursor-1"},
        )

    assert response.status_code == 200
    assert response.json()["items"][0]["benchmark_version_id"] == "version-2"
    assert response.json()["next_cursor"] == "cursor-2"
    mock_list.assert_called_once_with(
        user_id="user-1",
        benchmark_slug="legal-10",
        limit=10,
        cursor="cursor-1",
        offset=0,
    )


def test_create_benchmark_version_returns_version_and_validation(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.create_benchmark_version") as mock_create:
        mock_create.return_value = {
            "benchmark_version": {
                "benchmark_version_id": "version-2",
                "version_label": "v0.2.0",
                "version_status": "draft",
                "dataset_version_id": "dataset-version-2",
                "task_name": "legal_eval_v2",
                "task_file_ref": None,
                "task_definition_jsonb": {"steps": [{"step_id": "d1"}]},
            },
            "validation_summary": {
                "validation_status": "warn",
                "warning_count": 1,
                "issue_count": 0,
            },
        }

        response = superuser_client.post(
            "/agchain/benchmarks/legal-10/versions",
            json={
                "version_label": "v0.2.0",
                "dataset_version_id": "dataset-version-2",
                "task_name": "legal_eval_v2",
                "task_definition_jsonb": {"steps": [{"step_id": "d1"}]},
                "solver_plan_jsonb": {"kind": "serial"},
                "scorer_refs_jsonb": [{"scorer_version_id": "scorer-version-1"}],
                "tool_refs_jsonb": [{"tool_version_id": "tool-version-1"}],
                "sandbox_profile_id": "sandbox-1",
                "sandbox_overrides_jsonb": {"cpu": "2"},
                "model_roles_jsonb": {"evaluated": ["model-1"]},
                "generate_config_jsonb": {"temperature": 0},
                "eval_config_jsonb": {"max_samples": 25},
                "publish": False,
            },
        )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["benchmark_version"]["benchmark_version_id"] == "version-2"
    assert response.json()["validation_summary"]["validation_status"] == "warn"
    assert mock_create.call_args.kwargs["user_id"] == "user-1"
    assert mock_create.call_args.kwargs["benchmark_slug"] == "legal-10"


def test_get_benchmark_version_returns_runtime_detail(client):
    with patch("app.api.routes.agchain_benchmarks.get_benchmark_version") as mock_get:
        mock_get.return_value = {
            "benchmark_version": {
                "benchmark_version_id": "version-2",
                "version_label": "v0.2.0",
                "version_status": "draft",
                "dataset_version_id": "dataset-version-2",
                "task_name": "legal_eval_v2",
                "task_file_ref": None,
                "task_definition_jsonb": {"steps": [{"step_id": "d1"}]},
            },
            "dataset_version": {
                "dataset_version_id": "dataset-version-2",
                "version_label": "v2",
            },
            "scorer_refs": [{"scorer_version_id": "scorer-version-1", "position": 1}],
            "tool_refs": [{"tool_version_id": "tool-version-1", "position": 1}],
            "sandbox_profile": {"sandbox_profile_id": "sandbox-1"},
            "model_roles": {"evaluated": ["model-1"]},
            "generate_config": {"temperature": 0},
            "eval_config": {"max_samples": 25},
            "validation_summary": {"validation_status": "warn"},
        }

        response = client.get("/agchain/benchmarks/legal-10/versions/version-2")

    assert response.status_code == 200
    assert response.json()["benchmark_version"]["task_name"] == "legal_eval_v2"
    assert response.json()["dataset_version"]["dataset_version_id"] == "dataset-version-2"
    mock_get.assert_called_once_with(
        user_id="user-1",
        benchmark_slug="legal-10",
        benchmark_version_id="version-2",
    )


def test_validate_benchmark_version_returns_summary(superuser_client):
    with patch("app.api.routes.agchain_benchmarks.validate_benchmark_version") as mock_validate:
        mock_validate.return_value = {
            "issues": [],
            "warnings": [{"code": "missing_scorer_alias", "message": "Alias not set"}],
            "resolved_refs": {
                "dataset_version_id": "dataset-version-2",
                "scorer_version_ids": ["scorer-version-1"],
            },
            "compatibility_summary": {
                "validation_status": "warn",
                "task_definition_source": "resolved_from_steps",
            },
        }

        response = superuser_client.post(
            "/agchain/benchmarks/legal-10/validate",
            json={"benchmark_version_id": "version-2"},
        )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["compatibility_summary"]["validation_status"] == "warn"
    mock_validate.assert_called_once_with(
        user_id="user-1",
        benchmark_slug="legal-10",
        payload={"benchmark_version_id": "version-2"},
    )


def test_get_benchmark_version_synthesizes_runtime_task_definition_for_legacy_version():
    from app.domain.agchain.task_registry import get_benchmark_version

    admin = _RegistryAdmin(
        tables={
            "agchain_benchmarks": [
                {
                    "benchmark_id": "benchmark-1",
                    "project_id": "project-1",
                    "benchmark_slug": "legal-10",
                    "benchmark_name": "Legal-10",
                    "description": "Legal analysis benchmark.",
                    "current_draft_version_id": "version-1",
                    "current_published_version_id": None,
                }
            ],
            "agchain_benchmark_versions": [
                {
                    "benchmark_version_id": "version-1",
                    "benchmark_id": "benchmark-1",
                    "version_label": "v0.1.0",
                    "version_status": "draft",
                    "plan_family": "custom",
                    "step_count": 2,
                    "validation_status": "unknown",
                    "validation_issue_count": 0,
                    "dataset_version_id": "dataset-version-1",
                    "task_name": "legal_eval_v1",
                    "task_file_ref": None,
                    "task_definition_jsonb": None,
                    "solver_plan_jsonb": {"kind": "serial"},
                    "sandbox_profile_id": None,
                    "sandbox_overrides_jsonb": {},
                    "model_roles_jsonb": {"evaluated": ["model-1"]},
                    "generate_config_jsonb": {"temperature": 0},
                    "eval_config_jsonb": {"max_samples": 10},
                    "validation_summary_jsonb": {},
                }
            ],
            "agchain_benchmark_steps": [
                {
                    "benchmark_step_id": "step-1",
                    "benchmark_version_id": "version-1",
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
                    "step_config_jsonb": {"system_prompt_ref": "issue_spotting_v1"},
                    "updated_at": "2026-03-31T10:05:00Z",
                },
                {
                    "benchmark_step_id": "step-2",
                    "benchmark_version_id": "version-1",
                    "step_order": 2,
                    "step_id": "j1",
                    "display_name": "Judge",
                    "step_kind": "judge",
                    "api_call_boundary": "own_call",
                    "inject_payloads": [],
                    "scoring_mode": "judge",
                    "output_contract": "judge_pair_v1",
                    "scorer_ref": None,
                    "judge_prompt_ref": "judge_prompt_v1",
                    "judge_grades_step_ids": ["d1"],
                    "enabled": True,
                    "step_config_jsonb": {"temperature": 0},
                    "updated_at": "2026-03-31T10:06:00Z",
                },
            ],
            "agchain_benchmark_model_targets": [
                {
                    "benchmark_version_id": "version-1",
                    "model_target_id": "model-1",
                    "selection_role": "evaluated",
                }
            ],
            "agchain_benchmark_version_scorers": [],
            "agchain_benchmark_version_tools": [],
        }
    )

    with (
        patch("app.domain.agchain.task_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.task_registry.require_project_access",
            return_value={"project_id": "project-1", "membership_role": "project_viewer"},
        ),
    ):
        payload = get_benchmark_version(
            user_id="user-1",
            benchmark_slug="legal-10",
            benchmark_version_id="version-1",
        )

    runtime = payload["benchmark_version"]["task_definition_jsonb"]
    assert runtime["dataset_version_id"] == "dataset-version-1"
    assert [step["step_id"] for step in runtime["steps"]] == ["d1", "j1"]
    assert payload["model_roles"] == {"evaluated": ["model-1"]}


def test_validate_benchmark_version_refreshes_runtime_snapshot_from_steps():
    from app.domain.agchain.task_registry import validate_benchmark_version

    admin = _RegistryAdmin(
        tables={
            "agchain_benchmarks": [
                {
                    "benchmark_id": "benchmark-1",
                    "project_id": "project-1",
                    "benchmark_slug": "legal-10",
                    "benchmark_name": "Legal-10",
                    "description": "Legal analysis benchmark.",
                    "current_draft_version_id": "version-1",
                    "current_published_version_id": None,
                }
            ],
            "agchain_benchmark_versions": [
                {
                    "benchmark_version_id": "version-1",
                    "benchmark_id": "benchmark-1",
                    "version_label": "v0.1.0",
                    "version_status": "draft",
                    "plan_family": "custom",
                    "step_count": 1,
                    "validation_status": "unknown",
                    "validation_issue_count": 0,
                    "dataset_version_id": "dataset-version-1",
                    "task_name": "legal_eval_v1",
                    "task_file_ref": None,
                    "task_definition_jsonb": None,
                    "solver_plan_jsonb": {"kind": "serial"},
                    "sandbox_profile_id": None,
                    "sandbox_overrides_jsonb": {},
                    "model_roles_jsonb": {"evaluated": ["model-1"]},
                    "generate_config_jsonb": {"temperature": 0},
                    "eval_config_jsonb": {"max_samples": 10},
                    "validation_summary_jsonb": {},
                }
            ],
            "agchain_benchmark_steps": [
                {
                    "benchmark_step_id": "step-1",
                    "benchmark_version_id": "version-1",
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
                    "step_config_jsonb": {"system_prompt_ref": "issue_spotting_v1"},
                    "updated_at": "2026-03-31T10:05:00Z",
                }
            ],
            "agchain_benchmark_model_targets": [
                {
                    "benchmark_version_id": "version-1",
                    "model_target_id": "model-1",
                    "selection_role": "evaluated",
                }
            ],
            "agchain_benchmark_version_scorers": [],
            "agchain_benchmark_version_tools": [],
        }
    )

    with (
        patch("app.domain.agchain.task_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.task_registry.require_project_write_access",
            return_value={"project_id": "project-1", "membership_role": "project_admin"},
        ),
    ):
        payload = validate_benchmark_version(
            user_id="user-1",
            benchmark_slug="legal-10",
            payload={"benchmark_version_id": "version-1"},
        )

    assert payload["compatibility_summary"]["validation_status"] == "pass"
    version_updates = [call for call in admin.update_calls if call[0] == "agchain_benchmark_versions"]
    assert version_updates, "expected benchmark version update"
    updated_payload = version_updates[0][1]
    assert updated_payload["task_definition_jsonb"]["steps"][0]["step_id"] == "d1"
    assert updated_payload["validation_summary_jsonb"]["validation_status"] == "pass"
