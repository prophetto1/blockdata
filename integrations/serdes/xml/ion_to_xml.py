from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\xml\IonToXml.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class IonToXml(Task):
    """Convert an ION file into XML."""
    from: Property[str]
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    root_name: Property[str] = Property.ofValue("items")
    time_zone_id: Property[str] = Property.ofValue(ZoneId.systemDefault().toString())

    def run(self, run_context: RunContext) -> IonToXml.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
