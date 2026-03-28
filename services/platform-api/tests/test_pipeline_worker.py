from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import ANY

import pytest

from app.workers import pipeline_jobs


def _job_row(**overrides):
    row = {
        "job_id": "job-1",
        "pipeline_kind": "markdown_index_builder",
        "status": "running",
        "stage": "queued",
        "section_count": None,
        "chunk_count": None,
        "embedding_provider": None,
        "embedding_model": None,
    }
    row.update(overrides)
    return row


def test_run_pipeline_job_sync_marks_complete(monkeypatch):
    updates: list[tuple[str, dict]] = []
    completed_logs: list[dict] = []

    monkeypatch.setattr(pipeline_jobs, "_load_pipeline_job_sync", lambda job_id: _job_row(job_id=job_id))
    monkeypatch.setattr(
        pipeline_jobs,
        "_update_pipeline_job_sync",
        lambda job_id, values: updates.append((job_id, dict(values))),
    )
    monkeypatch.setattr(
        pipeline_jobs,
        "_resolve_pipeline_handler",
        lambda pipeline_kind: (
            lambda *, job, set_stage, heartbeat: {
                "section_count": 4,
                "chunk_count": 9,
                "embedding_provider": "openai",
                "embedding_model": "text-embedding-3-small",
                "deliverable_kinds": ["lexical_sqlite", "semantic_zip"],
            }
        ),
    )
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_complete", lambda **kwargs: None)
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_duration", lambda **kwargs: None)
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_failed", lambda **kwargs: None)
    monkeypatch.setattr(
        pipeline_jobs,
        "log_pipeline_job_completed",
        lambda **kwargs: completed_logs.append(dict(kwargs)),
    )
    monkeypatch.setattr(pipeline_jobs, "log_pipeline_job_failed", lambda **kwargs: None)

    pipeline_jobs._run_pipeline_job_sync("job-1", "markdown_index_builder")

    assert updates[0] == ("job-1", {"heartbeat_at": ANY, "stage": "queued"})
    assert updates[-1][0] == "job-1"
    assert updates[-1][1]["status"] == "complete"
    assert updates[-1][1]["stage"] == "packaging"
    assert updates[-1][1]["section_count"] == 4
    assert updates[-1][1]["chunk_count"] == 9
    assert updates[-1][1]["embedding_provider"] == "openai"
    assert updates[-1][1]["embedding_model"] == "text-embedding-3-small"
    assert completed_logs == [
        {
            "pipeline_kind": "markdown_index_builder",
            "deliverable_kinds": ["lexical_sqlite", "semantic_zip"],
            "section_count": 4,
            "chunk_count": 9,
        }
    ]


def test_run_pipeline_job_sync_marks_failed(monkeypatch):
    updates: list[tuple[str, dict]] = []
    failed_logs: list[dict] = []

    def _boom(*, job, set_stage, heartbeat):
        set_stage("embedding")
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(pipeline_jobs, "_load_pipeline_job_sync", lambda job_id: _job_row(job_id=job_id))
    monkeypatch.setattr(
        pipeline_jobs,
        "_update_pipeline_job_sync",
        lambda job_id, values: updates.append((job_id, dict(values))),
    )
    monkeypatch.setattr(pipeline_jobs, "_resolve_pipeline_handler", lambda pipeline_kind: _boom)
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_complete", lambda **kwargs: None)
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_duration", lambda **kwargs: None)
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_failed", lambda **kwargs: None)
    monkeypatch.setattr(pipeline_jobs, "log_pipeline_job_completed", lambda **kwargs: None)
    monkeypatch.setattr(
        pipeline_jobs,
        "log_pipeline_job_failed",
        lambda **kwargs: failed_logs.append(dict(kwargs)),
    )

    with pytest.raises(RuntimeError):
        pipeline_jobs._run_pipeline_job_sync("job-1", "markdown_index_builder")

    assert any(update[1].get("stage") == "embedding" for update in updates)
    assert updates[-1][1]["status"] == "failed"
    assert updates[-1][1]["failure_stage"] == "embedding"
    assert updates[-1][1]["error_message"] == "provider exploded"
    assert failed_logs == [
        {
            "pipeline_kind": "markdown_index_builder",
            "failure_stage": "embedding",
            "error_category": "RuntimeError",
        }
    ]


def test_reap_stale_jobs_once_reports_rows(monkeypatch):
    reaped_logs: list[dict] = []
    monkeypatch.setattr(
        pipeline_jobs,
        "_reap_stale_pipeline_jobs_sync",
        lambda: [
            {"pipeline_kind": "markdown_index_builder", "stage": "embedding"},
            {"pipeline_kind": "markdown_index_builder", "stage": "chunking"},
        ],
    )
    monkeypatch.setattr(pipeline_jobs, "record_pipeline_job_reaped", lambda **kwargs: None)
    monkeypatch.setattr(
        pipeline_jobs,
        "log_pipeline_job_reaped",
        lambda **kwargs: reaped_logs.append(dict(kwargs)),
    )

    count = pipeline_jobs._reap_stale_jobs_once_sync()

    assert count == 2
    assert reaped_logs == [
        {
            "pipeline_kind": "markdown_index_builder",
            "failure_stage": "embedding",
            "recovery_reason": "heartbeat_timeout",
        },
        {
            "pipeline_kind": "markdown_index_builder",
            "failure_stage": "chunking",
            "recovery_reason": "heartbeat_timeout",
        },
    ]


@pytest.mark.asyncio
async def test_supervisor_iteration_claims_and_dispatches(monkeypatch):
    dispatched: list[tuple] = []

    class _FakePool:
        is_saturated = False

        def submit(self, fn, *args):
            dispatched.append((fn, *args))
            future = asyncio.get_running_loop().create_future()
            future.set_result(None)
            return future

    monkeypatch.setattr(
        pipeline_jobs,
        "list_pipeline_worker_definitions",
        lambda: [
            {
                "pipeline_kind": "markdown_index_builder",
                "handler_module": "app.pipelines.markdown_index_builder",
                "handler_name": "run_markdown_index_builder",
            }
        ],
    )
    monkeypatch.setattr(pipeline_jobs, "_reap_stale_jobs_once", lambda: asyncio.sleep(0, result=0))
    monkeypatch.setattr(
        pipeline_jobs,
        "_claim_pipeline_jobs_once_sync",
        lambda pipeline_kind, limit: [{"job_id": "job-1", "pipeline_kind": pipeline_kind}],
    )
    monkeypatch.setattr(pipeline_jobs, "get_conversion_pool", lambda: _FakePool())
    monkeypatch.setattr(pipeline_jobs, "_run_pipeline_job_sync", lambda job_id, pipeline_kind: None)

    result = await pipeline_jobs._run_pipeline_supervisor_iteration(wait_for_dispatched=True)

    assert result == {"claimed": 1, "reaped": 0, "dispatched": 1}
    assert dispatched == [(pipeline_jobs._run_pipeline_job_sync, "job-1", "markdown_index_builder")]
