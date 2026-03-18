from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\Json.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Json(AbstractPythonTarget):
    """Load data into JSON files with a Singer target."""

    def destination_directory(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Json.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        state_key: str | None = None
        uris: dict[str, str] | None = None
