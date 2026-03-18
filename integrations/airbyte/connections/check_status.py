from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\connections\CheckStatus.java
# WARNING: Unresolved types: Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.airbyte.abstract_airbyte_connection import AbstractAirbyteConnection
from integrations.airbyte.models.job_info import JobInfo
from integrations.airbyte.models.job_status import JobStatus
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CheckStatus(AbstractAirbyteConnection):
    """Check status of an Airbyte sync."""
    e_n_d_e_d__j_o_b__s_t_a_t_u_s: ClassVar[list[JobStatus]] = List.of(
        JobStatus.FAILED,
        JobStatus.CANCELLED,
        JobStatus.SUCCEEDED
    )
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    logged_line: dict[int, int] = field(default_factory=dict)
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))
    job_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> CheckStatus.Output:
        raise NotImplementedError  # TODO: translate from Java

    def send_log(self, logger: Logger, job: JobInfo) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        final_job_status: str | None = None
