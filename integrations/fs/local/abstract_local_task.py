from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractLocalTask(Task):
    a_l_l_o_w_e_d__p_a_t_h_s: str | None = None

    def allowed_paths(self, run_context: RunContext) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_local_path(self, rendered_path: str, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def validate_path(self, path: Path, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
