from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\deals\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.pipedrive.abstract_pipedrive_task import AbstractPipedriveTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractPipedriveTask):
    """Create a new deal in Pipedrive CRM"""
    title: Property[str]
    value: Property[float] | None = None
    currency: Property[str] | None = None
    person_id: Property[int] | None = None
    org_id: Property[int] | None = None
    user_id: Property[int] | None = None
    stage_id: Property[int] | None = None
    status: Property[str] | None = None
    expected_close_date: Property[str] | None = None
    probability: Property[float] | None = None
    visible_to: Property[str] | None = None
    custom_fields: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        deal_id: int | None = None
        add_time: str | None = None
        update_time: str | None = None
