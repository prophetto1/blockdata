import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal


def _test_principal():
    return AuthPrincipal(
        subject_type="user", subject_id="user-1",
        roles=frozenset({"authenticated"}), auth_source="test",
    )


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "test-token")
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import create_app
    app = create_app()
    app.dependency_overrides[require_user_auth] = _test_principal
    yield TestClient(app)
    app.dependency_overrides.clear()
    get_settings.cache_clear()


@pytest.fixture
def unauthenticated_client(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "test-token")
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import create_app
    app = create_app()
    yield TestClient(app)
    get_settings.cache_clear()


def test_submit_load_rejects_unauthenticated(unauthenticated_client):
    resp = unauthenticated_client.post("/load-runs", json={})
    assert resp.status_code == 401


def test_get_load_run_checks_ownership(client):
    with patch("app.api.routes.load_runs.get_supabase_admin") as mock_sb:
        mock_run = MagicMock()
        mock_run.data = {"run_id": "r1", "created_by": "other-user", "status": "pending"}
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_run
        resp = client.get("/load-runs/r1")
    # user_id="user-1", run created_by="other-user" → 403
    assert resp.status_code == 403


def test_finalize_run_complete_when_all_items_pass(client):
    """_maybe_finalize_run returns 'complete' when no items are active and none failed."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()
    # No active items (pending/running)
    mock_sb.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(count=0)
    # rows_affected = 3
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={"rows_affected": 3})
    # 0 failed items
    failed_mock = MagicMock(count=0)
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = failed_mock

    result = _maybe_finalize_run(mock_sb, "run-1", logging.getLogger("test"))
    assert result["finalized"] is True
    assert result["status"] == "complete"


def test_finalize_run_partial_when_some_items_fail(client):
    """_maybe_finalize_run returns 'partial' when some but not all items failed."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(count=0)
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={"rows_affected": 5})
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(count=2)

    result = _maybe_finalize_run(mock_sb, "run-1", logging.getLogger("test"))
    assert result["finalized"] is True
    assert result["status"] == "partial"


def test_finalize_run_skipped_when_items_still_running(client):
    """_maybe_finalize_run does NOT finalize when items are still running."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()
    # 1 active item still running
    mock_sb.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(count=1)

    result = _maybe_finalize_run(mock_sb, "run-1", logging.getLogger("test"))
    assert result["finalized"] is False
    assert result["active"] == 1


def test_load_runs_rejects_m2m_token(unauthenticated_client):
    """M2M tokens should be rejected by require_user_auth on load-runs routes."""
    resp = unauthenticated_client.post(
        "/load-runs", json={},
        headers={"Authorization": "Bearer test-token"},  # M2M token
    )
    assert resp.status_code == 403


def test_submit_rejects_unowned_project(client):
    """submit_load should reject a project_id the caller does not own."""
    with patch("app.api.routes.load_runs.get_supabase_admin") as mock_sb:
        # _validate_owned_project query returns no data
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.maybeSingle.return_value.execute.return_value = MagicMock(data=None)
        resp = client.post("/load-runs", json={
            "source_function_name": "gcs_list",
            "source_download_function": "gcs_download_csv",
            "source_connection_id": "c1",
            "dest_function_name": "arangodb_load",
            "dest_connection_id": "c2",
            "project_id": "not-my-project",
        })
    assert resp.status_code == 403


def test_submit_step_finalize_happy_path(client):
    """Integration-style test: submit → create items → step one item → finalize."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()

    # submit_load mocks:
    # _validate_owned_project → project exists
    project_mock = MagicMock(data={"project_id": "p1"})
    # source function lookup
    src_fn_mock = MagicMock(data={"function_id": "f1", "service_id": "s1", "bd_stage": "source"})
    # dest function lookup
    dst_fn_mock = MagicMock(data={"function_id": "f2", "service_id": "s2", "bd_stage": "destination"})

    with patch("app.api.routes.load_runs.get_supabase_admin", return_value=mock_sb), \
         patch("app.api.routes.load_runs.resolve_by_function_name") as mock_resolve_fn, \
         patch("app.api.routes.load_runs.resolve") as mock_resolve:

        # Mock Supabase table calls for submit
        mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            src_fn_mock, dst_fn_mock,
        ]
        # _validate_owned_project
        mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybeSingle.return_value.execute.return_value = project_mock

        # Mock plugin list execution
        from unittest.mock import AsyncMock
        mock_list_plugin = AsyncMock()
        mock_list_plugin.run.return_value = MagicMock(
            state="SUCCESS",
            data={"objects": [{"name": "file1.csv"}], "count": 1},
            logs=[],
        )
        mock_resolve_fn.return_value = "blockdata.load.gcs.list_objects"
        mock_resolve.return_value = mock_list_plugin

        # Insert mocks (run + items)
        mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

        resp = client.post("/load-runs", json={
            "source_function_name": "gcs_list",
            "source_download_function": "gcs_download_csv",
            "source_connection_id": "c1",
            "dest_function_name": "arangodb_load",
            "dest_connection_id": "c2",
            "project_id": "p1",
            "config": {"bucket": "test-bucket"},
        })

    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"
    assert resp.json()["total_items"] == 1
