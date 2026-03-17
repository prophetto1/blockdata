from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.powerbi.abstract_power_bi import AbstractPowerBi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class RefreshGroupDataset(AbstractPowerBi, RunnableTask):
    """Refresh a Power BI dataset"""
    group_id: Property[str] | None = None
    dataset_id: Property[str] | None = None
    wait: Property[bool] | None = None
    poll_duration: Property[timedelta]
    wait_duration: Property[timedelta]

    def run(self, run_context: RunContext) -> RefreshGroupDataset:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        request_id: str | None = None
        status: str | None = None
        extended_status: str | None = None
        refresh_type: str | None = None
        start_time: datetime | None = None
        end_time: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    request_id: str | None = None
    status: str | None = None
    extended_status: str | None = None
    refresh_type: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
