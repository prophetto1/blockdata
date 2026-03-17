from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\AbstractPythonTarget.java
# WARNING: Unresolved types: Exception, TypeReference, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from integrations.singer.abstract_python_singer import AbstractPythonSinger
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractPythonTarget(ABC, AbstractPythonSinger):
    from: Property[str]
    t_y_p_e__r_e_f_e_r_e_n_c_e: ClassVar[TypeReference[dict[str, Any]]] = new TypeReference<>() {
    }

    def run_target(self, run_context: RunContext) -> AbstractPythonTarget.Output:
        raise NotImplementedError  # TODO: translate from Java

    def taps_sync(self, temp_file: Path, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_singer(self, commands: list[str], run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        state_key: str | None = None
