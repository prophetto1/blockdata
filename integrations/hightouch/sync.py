from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.hightouch.abstract_hightouch_connection import AbstractHightouchConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.hightouch.models.run_details import RunDetails
from integrations.hightouch.models.run_status import RunStatus
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.hightouch.models.sync_details_response import SyncDetailsResponse


@dataclass(slots=True, kw_only=True)
class Sync(AbstractHightouchConnection, RunnableTask):
    """Trigger and monitor a Hightouch sync"""
    e_n_d_e_d__s_t_a_t_u_s: list[RunStatus] | None = None
    s_t_a_t_u_s__r_e_f_r_e_s_h__r_a_t_e: timedelta | None = None
    sync_id: Property[int]
    full_resynchronization: Property[bool] | None = None
    wait: Property[bool] | None = None
    max_duration: Property[timedelta] | None = None
    logged_line: dict[Integer, Integer] | None = None

    def run(self, run_context: RunContext) -> Sync:
        raise NotImplementedError  # TODO: translate from Java

    def send_log(self, logger: Logger, sync_details: SyncDetailsResponse, run: RunDetails) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        run_id: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    run_id: int | None = None
