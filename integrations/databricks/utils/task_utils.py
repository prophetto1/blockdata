from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class TaskUtils:

    def depends_on(self, depends_on: list[String]) -> list[TaskDependency]:
        raise NotImplementedError  # TODO: translate from Java
