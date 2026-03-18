from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\TriggerRun.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.dbt.cloud.abstract_dbt_cloud import AbstractDbtCloud
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TriggerRun(AbstractDbtCloud):
    """Start a dbt Cloud job run"""
    job_id: Property[str]
    cause: Property[str] = Property.ofValue("Triggered by Kestra.")
    wait: Property[bool] = Property.ofValue(Boolean.TRUE)
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    parse_run_results: Property[bool] = Property.ofValue(Boolean.TRUE)
    git_sha: Property[str] | None = None
    git_branch: Property[str] | None = None
    schema_override: Property[str] | None = None
    dbt_version_override: Property[str] | None = None
    threads_override: Property[str] | None = None
    target_name_override: Property[str] | None = None
    generate_docs_override: Property[bool] | None = None
    timeout_seconds_override: Property[int] | None = None
    steps_override: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> TriggerRun.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        run_id: int | None = None
        run_results: str | None = None
        manifest: str | None = None
