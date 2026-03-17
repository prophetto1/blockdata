from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\IonToAvro.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.serdes.avro.abstract_avro_converter import AbstractAvroConverter
from integrations.serdes.on_bad_lines import OnBadLines
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class IonToAvro(AbstractAvroConverter):
    """Convert an ION file into Avro."""
    from: Property[str]
    on_bad_lines: Property[OnBadLines] = Property.ofValue(OnBadLines.ERROR)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
