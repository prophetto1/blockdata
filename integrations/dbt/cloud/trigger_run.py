from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.dbt.cloud.abstract_dbt_cloud import AbstractDbtCloud
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TriggerRun(AbstractDbtCloud, RunnableTask):
    """Start a dbt Cloud job run"""
    job_id: Property[str]
    cause: Property[str]
    git_sha: Property[str] | None = None
    git_branch: Property[str] | None = None
    schema_override: Property[str] | None = None
    dbt_version_override: Property[str] | None = None
    threads_override: Property[str] | None = None
    target_name_override: Property[str] | None = None
    generate_docs_override: Property[bool] | None = None
    timeout_seconds_override: Property[int] | None = None
    steps_override: Property[list[String]] | None = None
    wait: Property[bool] | None = None
    poll_frequency: Property[timedelta] | None = None
    max_duration: Property[timedelta] | None = None
    parse_run_results: Property[bool] | None = None

    def run(self, run_context: RunContext) -> TriggerRun:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        run_id: int | None = None
        run_results: str | None = None
        manifest: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    run_id: int | None = None
    run_results: str | None = None
    manifest: str | None = None
