from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\csv\IonToCsv.java
# WARNING: Unresolved types: CsvWriter, Exception, Writer, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.serdes.abstract_text_writer import AbstractTextWriter
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class IonToCsv(AbstractTextWriter):
    """Convert an ION file into CSV."""
    from: Property[str]
    header: Property[bool] = Property.ofValue(true)
    field_separator: Property[char] = Property.ofValue(',')
    text_delimiter: Property[char] = Property.ofValue('"')
    line_delimiter: Property[str] = Property.ofValue("\n")
    always_delimit_text: Property[bool] = Property.ofValue(false)
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def csv_writer(self, writer: Writer, run_context: RunContext) -> CsvWriter:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
