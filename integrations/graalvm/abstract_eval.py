from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\AbstractEval.java
# WARNING: Unresolved types: Exception, Value, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.graalvm.abstract_script import AbstractScript
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractEval(ABC, AbstractScript):
    outputs: Property[list[str]] | None = None

    def run(self, run_context: RunContext, language_id: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def gather_outputs(self, rendered_outputs: list[str], value: Value) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def as(self, member: Value) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        result: Any | None = None
        outputs: dict[str, Any] | None = None
