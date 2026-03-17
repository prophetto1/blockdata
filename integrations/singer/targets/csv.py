from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Csv(AbstractPythonTarget, RunnableTask):
    """Load data into a CSV file with a Singer target."""
    delimiter: str = ","
    quote_characters: str = "\""

    def destination_directory(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Csv:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        state_key: str | None = None
        uris: dict[String, URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    state_key: str | None = None
    uris: dict[String, URI] | None = None
