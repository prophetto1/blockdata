from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\utils\TaskUtils.java
# WARNING: Unresolved types: TaskDependency

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TaskUtils:

    @staticmethod
    def depends_on(depends_on: list[str]) -> list[TaskDependency]:
        raise NotImplementedError  # TODO: translate from Java
