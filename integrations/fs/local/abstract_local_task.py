from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\local\AbstractLocalTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractLocalTask(ABC, Task):
    a_l_l_o_w_e_d__p_a_t_h_s: ClassVar[str] = "allowed-paths"

    def allowed_paths(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_local_path(self, rendered_path: str, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def validate_path(self, path: Path, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
