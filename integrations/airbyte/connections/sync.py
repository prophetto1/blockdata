from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.airbyte.abstract_airbyte_connection import AbstractAirbyteConnection
from integrations.dbt.cloud.models.job_status import JobStatus
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Sync(AbstractAirbyteConnection, RunnableTask):
    """Run an Airbyte sync."""
    e_n_d_e_d__j_o_b__s_t_a_t_u_s: list[JobStatus] | None = None
    connection_id: Property[str]
    wait: Property[bool] | None = None
    max_duration: Property[timedelta] | None = None
    poll_frequency: Property[timedelta] | None = None
    fail_on_active_sync: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Sync:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        job_id: int | None = None
        already_running: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    job_id: int | None = None
    already_running: bool | None = None
