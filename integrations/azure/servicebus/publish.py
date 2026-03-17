from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.servicebus.abstract_service_bus_task import AbstractServiceBusTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Publish(AbstractServiceBusTask, RunnableTask):
    from: Property[Any]

    def run(self, run_context: RunContext) -> Publish:
        raise NotImplementedError  # TODO: translate from Java
