from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\Sync.java
# WARNING: Unresolved types: Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.hightouch.abstract_hightouch_connection import AbstractHightouchConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.hightouch.models.run_details import RunDetails
from integrations.hightouch.models.run_status import RunStatus
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.hightouch.models.sync_details_response import SyncDetailsResponse


@dataclass(slots=True, kw_only=True)
class Sync(AbstractHightouchConnection):
    """Trigger and monitor a Hightouch sync"""
    sync_id: Property[int]
    e_n_d_e_d__s_t_a_t_u_s: ClassVar[list[RunStatus]] = List.of(
        RunStatus.FAILED,
        RunStatus.CANCELLED,
        RunStatus.SUCCESS,
        RunStatus.COMPLETED_WITH_ERRORS,
        RunStatus.WARNING,
        RunStatus.INTERRUPTED
    )
    s_t_a_t_u_s__r_e_f_r_e_s_h__r_a_t_e: ClassVar[timedelta] = Duration.ofSeconds(1)
    full_resynchronization: Property[bool] = Property.ofValue(false)
    wait: Property[bool] = Property.ofValue(true)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))
    logged_line: dict[int, int] = field(default_factory=dict)

    def run(self, run_context: RunContext) -> Sync.Output:
        raise NotImplementedError  # TODO: translate from Java

    def send_log(self, logger: Logger, sync_details: SyncDetailsResponse, run: RunDetails) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        run_id: int | None = None
