from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\cloud\jobs\AbstractTrigger.java
# WARNING: Unresolved types: Exception, JobResponse, JobStatusEnum, JobTypeEnum, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from integrations.airbyte.cloud.abstract_airbyte_cloud import AbstractAirbyteCloud
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractTrigger(ABC, AbstractAirbyteCloud):
    """Run a sync on a connection."""
    connection_id: Property[str]
    e_n_d_e_d__s_t_a_t_u_s: ClassVar[list[JobStatusEnum]] = List.of(
        JobStatusEnum.INCOMPLETE,
        JobStatusEnum.FAILED,
        JobStatusEnum.CANCELLED,
        JobStatusEnum.SUCCEEDED
    )
    wait: Property[bool] = Property.ofValue(true)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))

    @abstractmethod
    def sync_type(self) -> JobTypeEnum:
        ...

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
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

        @staticmethod
        def of(job_response: JobResponse) -> Job:
            raise NotImplementedError  # TODO: translate from Java
