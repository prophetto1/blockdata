from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\connections\Sync.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.airbyte.abstract_airbyte_connection import AbstractAirbyteConnection
from integrations.airbyte.models.job_status import JobStatus
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Sync(AbstractAirbyteConnection):
    """Run an Airbyte sync."""
    connection_id: Property[str]
    e_n_d_e_d__j_o_b__s_t_a_t_u_s: ClassVar[list[JobStatus]] = List.of(
        JobStatus.FAILED,
        JobStatus.CANCELLED,
        JobStatus.SUCCEEDED
    )
    wait: Property[bool] = Property.ofValue(true)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))
    fail_on_active_sync: Property[bool] = Property.ofValue(true)

    def run(self, run_context: RunContext) -> Sync.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: int | None = None
        already_running: bool | None = None
