from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.singer.abstract_python_singer import AbstractPythonSinger
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractPythonTarget(AbstractPythonSinger):
    t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[Map[String, Object]] | None = None
    from: Property[str]

    def run_target(self, run_context: RunContext) -> AbstractPythonTarget:
        raise NotImplementedError  # TODO: translate from Java

    def taps_sync(self, temp_file: Path, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_singer(self, commands: list[String], run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        state_key: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    state_key: str | None = None
