from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.servicenow.abstract_service_now import AbstractServiceNow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractServiceNow, RunnableTask):
    """Update a ServiceNow record by sys_id"""
    table: Property[str]
    sys_id: Property[str]
    data: Property[dict[String, Object]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        result: dict[String, Object] | None = None

    @dataclass(slots=True)
    class UpdateResult:
        result: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    result: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class UpdateResult:
    result: dict[String, Object] | None = None
