from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\Labels.java
# WARNING: Unresolved types: Exception, ObjectMapper, TypeReference

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.execution_updatable_task import ExecutionUpdatableTask
from engine.core.models.label import Label
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Labels(Task):
    """Add or overwrite labels on the current execution."""
    labels: Any
    m_a_p__t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[dict[str, str]] = new TypeReference<>() {}
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()

    def update(self, execution: Execution, run_context: RunContext) -> Execution:
        raise NotImplementedError  # TODO: translate from Java
