from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\InferAvroSchemaFromIon.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class InferAvroSchemaFromIon(Task):
    """Try to infer an Avro schema from a ION file."""
    from: Property[str]
    number_of_rows_to_scan: Property[int] = Property.ofValue(100)

    def run(self, run_context: RunContext) -> InferAvroSchemaFromIon.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
