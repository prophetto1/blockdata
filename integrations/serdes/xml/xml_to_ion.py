from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\xml\XmlToIon.java
# WARNING: Unresolved types: Exception, JSONObject, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class XmlToIon(Task):
    """Convert an XML file into ION."""
    from: Property[str]
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    query: Property[str] | None = None
    parser_configuration: ParserConfiguration | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def result(self, json_object: JSONObject, run_context: RunContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

    @dataclass(slots=True)
    class ParserConfiguration:
        """XML parser configuration."""
        force_list: Property[list[str]] | None = None
