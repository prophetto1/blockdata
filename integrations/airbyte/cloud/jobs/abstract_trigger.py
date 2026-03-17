from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.airbyte.cloud.abstract_airbyte_cloud import AbstractAirbyteCloud
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractTrigger(AbstractAirbyteCloud, RunnableTask):
    """Run a sync on a connection."""
    e_n_d_e_d__s_t_a_t_u_s: list[JobStatusEnum] | None = None
    connection_id: Property[str]
    wait: Property[bool] | None = None
    max_duration: Property[timedelta] | None = None
    poll_frequency: Property[timedelta] | None = None

    def sync_type(self) -> JobTypeEnum:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        job: Job | None = None

    @dataclass(slots=True)
    class Job:
        job_id: int | None = None
        start_time: datetime | None = None
        last_updated_at: datetime | None = None
        job_type: JobTypeEnum | None = None
        status: JobStatusEnum | None = None
        duration: timedelta | None = None
        bytes_synced: int | None = None
        rows_synced: int | None = None

        def of(self, job_response: JobResponse) -> Job:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    job: Job | None = None


@dataclass(slots=True, kw_only=True)
class Job:
    job_id: int | None = None
    start_time: datetime | None = None
    last_updated_at: datetime | None = None
    job_type: JobTypeEnum | None = None
    status: JobStatusEnum | None = None
    duration: timedelta | None = None
    bytes_synced: int | None = None
    rows_synced: int | None = None

    def of(self, job_response: JobResponse) -> Job:
        raise NotImplementedError  # TODO: translate from Java
