from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\AbstractFileTransform.java
# WARNING: Unresolved types: Context, Exception, Flux, Function, IOException, InterruptedException, Publisher, Source, Writer, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.graalvm.abstract_script import AbstractScript
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractFileTransform(ABC, AbstractScript):
    from: Property[str]
    concurrent: Property[@Min(2) Integer] | None = None

    def run(self, run_context: RunContext, language_id: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def finalize(self, run_context: RunContext, flowable: Flux[Any], scripts: Source, output: Writer) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, run_context: RunContext, context: Context, scripts: Source) -> Function[Any, Publisher[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
