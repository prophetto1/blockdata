from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.airbyte.abstract_airbyte_connection import AbstractAirbyteConnection
from integrations.jenkins.job_info import JobInfo
from integrations.dbt.cloud.models.job_status import JobStatus
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CheckStatus(AbstractAirbyteConnection, RunnableTask):
    """Check status of an Airbyte sync."""
    e_n_d_e_d__j_o_b__s_t_a_t_u_s: list[JobStatus] | None = None
    job_id: Property[str] | None = None
    max_duration: Property[timedelta] | None = None
    logged_line: dict[Integer, Integer] | None = None
    poll_frequency: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> CheckStatus:
        raise NotImplementedError  # TODO: translate from Java

    def send_log(self, logger: Logger, job: JobInfo) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        final_job_status: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    final_job_status: str | None = None
