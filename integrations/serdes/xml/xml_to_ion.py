from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class XmlToIon(Task, RunnableTask):
    """Convert an XML file into ION."""
    from: Property[str]
    charset: Property[str] | None = None
    query: Property[str] | None = None
    parser_configuration: ParserConfiguration | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def result(self, json_object: JSONObject, run_context: RunContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None

    @dataclass(slots=True)
    class ParserConfiguration:
        """XML parser configuration."""
        force_list: Property[list[String]] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None


@dataclass(slots=True, kw_only=True)
class ParserConfiguration:
    """XML parser configuration."""
    force_list: Property[list[String]] | None = None
