from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-powerbi\src\main\java\io\kestra\plugin\powerbi\RefreshGroupDataset.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.powerbi.abstract_power_bi import AbstractPowerBi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class RefreshGroupDataset(AbstractPowerBi):
    """Refresh a Power BI dataset"""
    wait: Property[bool] = Property.ofValue(false)
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    wait_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(10))
    group_id: Property[str] | None = None
    dataset_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> RefreshGroupDataset.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        request_id: str | None = None
        status: str | None = None
        extended_status: str | None = None
        refresh_type: str | None = None
        start_time: datetime | None = None
        end_time: datetime | None = None
