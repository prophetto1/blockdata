from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.operation_queue import cancel_operation, complete_operation, fail_operation, lease_operation
from app.main import create_app
from app.workers import agchain_operations


MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


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


def _operation_status(**overrides):
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
        "created_at": "2026-03-31T20:00:00Z",
        "started_at": None,
        "heartbeat_at": None,
        "completed_at": None,
    }
    payload.update(overrides)
    return payload


def _operation_row(**overrides):
    row = {
        "operation_id": "operation-1",
        "project_id": "project-1",
        "operation_type": "dataset_preview",
        "status": "queued",
        "target_kind": "dataset_version_draft",
        "target_id": "draft-1",
        "idempotency_key": None,
        "payload_jsonb": {"draft_id": "draft-1"},
        "progress_jsonb": {},
        "last_error_jsonb": None,
        "result_jsonb": None,
        "attempt_count": 0,
        "max_attempts": 3,
        "lease_owner": None,
        "lease_expires_at": None,
        "started_at": None,
        "heartbeat_at": None,
        "completed_at": None,
        "cancel_requested_at": None,
        "created_by": "user-1",
        "created_at": "2026-03-31T20:00:00Z",
        "updated_at": "2026-03-31T20:00:00Z",
    }
    row.update(overrides)
    return row


class _OperationQuery:
    identity_fields = {
        "agchain_operations": "operation_id",
    }

    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._operation = "select"
        self._payload = None
        self._maybe_single = False

    def select(self, *_args, **_kwargs):
        self._operation = "select"
        return self

    def eq(self, key, value):
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

    def execute(self):
        self._admin.calls.append((self._table_name, self._operation, dict(self._filters)))
        rows = self._admin.tables.setdefault(self._table_name, [])

        if self._operation == "insert":
            payload = dict(self._payload or {})
            identity_field = self.identity_fields.get(self._table_name)
            if identity_field and identity_field not in payload:
                payload[identity_field] = f"{self._table_name}-generated-1"
            rows.append(payload)
            return type("R", (), {"data": [payload]})()

        if self._operation == "update":
            updated_rows = []
            for row in rows:
                if all(row.get(key) == value for key, value in self._filters.items()):
                    row.update(dict(self._payload or {}))
                    updated_rows.append(dict(row))
            return type("R", (), {"data": updated_rows})()

        selected = [
            dict(row)
            for row in rows
            if all(row.get(key) == value for key, value in self._filters.items())
        ]
        data = selected[0] if self._maybe_single and selected else (None if self._maybe_single else selected)
        return type("R", (), {"data": data})()


class _OperationAdmin:
    def __init__(self, *, tables=None):
        self.tables = tables or {}
        self.calls: list[tuple[str, str, dict[str, object]]] = []

    def table(self, name: str):
        return _OperationQuery(self, name)


def test_get_operation_route_returns_shared_contract(client):
    with (
        patch("app.api.routes.agchain_operations.load_operation_row", return_value=_operation_row()),
        patch(
            "app.api.routes.agchain_operations.require_project_access",
            return_value={"project_id": "project-1", "membership_role": "project_admin"},
        ),
        patch("app.api.routes.agchain_operations.load_operation_status", return_value=_operation_status()),
    ):
        response = client.get("/agchain/operations/operation-1")

    assert response.status_code == 200
    assert response.json() == _operation_status()


def test_cancel_operation_route_returns_updated_status(client):
    cancelled = _operation_status(status="cancel_requested")
    with (
        patch("app.api.routes.agchain_operations.load_operation_row", return_value=_operation_row(status="running")),
        patch(
            "app.api.routes.agchain_operations.require_project_access",
            return_value={"project_id": "project-1", "membership_role": "project_editor"},
        ),
        patch("app.api.routes.agchain_operations.cancel_operation", return_value=cancelled),
    ):
        response = client.post("/agchain/operations/operation-1/cancel")

    assert response.status_code == 200
    assert response.json() == cancelled


def test_get_operation_route_rejects_cross_project_access(client):
    with (
        patch("app.api.routes.agchain_operations.load_operation_row", return_value=_operation_row(project_id="project-2")),
        patch(
            "app.api.routes.agchain_operations.require_project_access",
            side_effect=HTTPException(status_code=403, detail="Project access denied"),
        ),
    ):
        response = client.get("/agchain/operations/operation-1")

    assert response.status_code == 403


def test_cancel_operation_route_rejects_cross_project_access(client):
    with (
        patch("app.api.routes.agchain_operations.load_operation_row", return_value=_operation_row(project_id="project-2")),
        patch(
            "app.api.routes.agchain_operations.require_project_access",
            side_effect=HTTPException(status_code=403, detail="Project access denied"),
        ),
    ):
        response = client.post("/agchain/operations/operation-1/cancel")

    assert response.status_code == 403


def test_lease_operation_reclaims_expired_running_row():
    admin = _OperationAdmin(
        tables={
            "agchain_operations": [
                _operation_row(
                    status="running",
                    attempt_count=1,
                    lease_owner="worker-old",
                    lease_expires_at="2026-03-31T19:59:00Z",
                )
            ]
        }
    )

    with patch("app.domain.agchain.operation_queue.get_supabase_admin", return_value=admin):
        leased = lease_operation(worker_id="worker-new", lease_seconds=60)

    assert leased["operation_id"] == "operation-1"
    assert leased["status"] == "running"
    assert leased["attempt_count"] == 2
    assert leased["lease_owner"] == "worker-new"
    assert leased["heartbeat_at"] is not None


def test_fail_operation_requeues_retryable_work_before_max_attempts():
    admin = _OperationAdmin(
        tables={
            "agchain_operations": [
                _operation_row(
                    status="running",
                    attempt_count=1,
                    max_attempts=3,
                    lease_owner="worker-1",
                    lease_expires_at="2026-03-31T20:10:00Z",
                )
            ]
        }
    )

    with patch("app.domain.agchain.operation_queue.get_supabase_admin", return_value=admin):
        failed = fail_operation(
            operation_id="operation-1",
            worker_id="worker-1",
            error={"message": "temporary upstream failure"},
            retryable=True,
        )

    assert failed["status"] == "queued"
    assert failed["attempt_count"] == 1
    assert failed["last_error"] == {"message": "temporary upstream failure"}


def test_complete_operation_requires_matching_worker_lease():
    admin = _OperationAdmin(
        tables={
            "agchain_operations": [
                _operation_row(
                    status="running",
                    attempt_count=1,
                    lease_owner="worker-1",
                    lease_expires_at="2026-03-31T20:10:00Z",
                )
            ]
        }
    )

    with patch("app.domain.agchain.operation_queue.get_supabase_admin", return_value=admin):
        with pytest.raises(HTTPException) as exc:
            complete_operation(
                operation_id="operation-1",
                worker_id="worker-2",
                result={"ok": True},
            )

    assert exc.value.status_code == 409


def test_run_claimed_operation_sync_writes_completed_result(monkeypatch):
    completions: list[dict] = []
    failures: list[dict] = []
    heartbeats: list[dict] = []

    monkeypatch.setattr(
        agchain_operations,
        "_resolve_operation_handler",
        lambda operation_type: (
            lambda *, operation, heartbeat: (
                heartbeat({"stage": "normalizing"}) or {"preview_row_count": 12}
            )
        ),
    )
    monkeypatch.setattr(
        agchain_operations,
        "complete_operation",
        lambda **kwargs: completions.append(dict(kwargs)) or _operation_status(status="completed", result=kwargs["result"]),
    )
    monkeypatch.setattr(
        agchain_operations,
        "fail_operation",
        lambda **kwargs: failures.append(dict(kwargs)) or _operation_status(status="failed"),
    )
    monkeypatch.setattr(
        agchain_operations,
        "heartbeat_operation",
        lambda **kwargs: heartbeats.append(dict(kwargs)) or _operation_row(status="running"),
    )

    agchain_operations._run_claimed_operation_sync(
        operation=_operation_row(status="running", lease_owner="worker-1"),
        worker_id="worker-1",
    )

    assert heartbeats == [
        {
            "operation_id": "operation-1",
            "worker_id": "worker-1",
            "progress": {"stage": "normalizing"},
        }
    ]
    assert completions == [
        {
            "operation_id": "operation-1",
            "worker_id": "worker-1",
            "result": {"preview_row_count": 12},
            "progress": {"stage": "normalizing"},
        }
    ]
    assert failures == []


@pytest.mark.asyncio
async def test_start_operations_worker_is_idempotent(monkeypatch):
    created_tasks = []

    class _FakeTask:
        def cancel(self):
            return None

    monkeypatch.setattr(
        agchain_operations.asyncio,
        "create_task",
        lambda coro: (created_tasks.append(coro), coro.close(), _FakeTask())[-1],
    )

    agchain_operations._worker_task = None
    agchain_operations._worker_stop_event = None
    try:
        first = agchain_operations.start_agchain_operations_worker()
        second = agchain_operations.start_agchain_operations_worker()
    finally:
        agchain_operations._worker_task = None
        agchain_operations._worker_stop_event = None

    assert first is second
    assert len(created_tasks) == 1


def test_operations_prereq_migration_exists():
    matches = sorted(MIGRATIONS_DIR.glob("*_agchain_operations_prereqs.sql"))
    assert len(matches) == 1

    normalized = " ".join(matches[0].read_text(encoding="utf-8").split())
    assert "CREATE TABLE IF NOT EXISTS public.agchain_operations" in normalized
    assert "operation_id uuid primary key default gen_random_uuid()" in normalized
    assert "project_id uuid not null references public.user_projects(project_id) on delete cascade" in normalized
    assert "lease_owner text" in normalized
    assert "lease_expires_at timestamptz" in normalized
    assert "cancel_requested_at timestamptz" in normalized
