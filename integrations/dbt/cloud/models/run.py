from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.dbt.cloud.models.environment import Environment
from integrations.dbt.cloud.models.job import Job
from integrations.dbt.cloud.models.job_status import JobStatus
from integrations.dbt.cloud.models.job_status_humanized_enum import JobStatusHumanizedEnum
from integrations.dbt.cloud.models.step import Step
from engine.plugin.core.http.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class Run:
    id: int | None = None
    trigger_id: int | None = None
    account_id: int | None = None
    project_id: int | None = None
    job_id: int | None = None
    job_definition_id: int | None = None
    status: JobStatus | None = None
    git_branch: str | None = None
    git_sha: str | None = None
    status_message: str | None = None
    dbt_version: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    dequeued_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    last_checked_at: datetime | None = None
    last_heartbeat_at: datetime | None = None
    should_start_at: datetime | None = None
    owner_thread_id: str | None = None
    executed_by_thread_id: str | None = None
    deferring_run_id: str | None = None
    artifacts_saved: bool | None = None
    artifact_s3_path: str | None = None
    has_docs_generated: bool | None = None
    has_sources_generated: bool | None = None
    notifications_sent: bool | None = None
    scribe_enabled: bool | None = None
    trigger: Trigger | None = None
    job: Job | None = None
    environment: Environment | None = None
    run_steps: list[Step] | None = None
    duration: str | None = None
    queued_duration: str | None = None
    run_duration: str | None = None
    duration_humanized: str | None = None
    queued_duration_humanized: str | None = None
    run_duration_humanized: str | None = None
    finished_at_humanized: str | None = None
    status_humanized: JobStatusHumanizedEnum | None = None
    created_at_humanized: str | None = None
