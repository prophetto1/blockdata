from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\templating\TemplatedTask.java
# WARNING: Unresolved types: Exception, ObjectMapper

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class TemplatedTask(Task):
    """Render and run a task from a templated spec."""
    spec: Property[str]
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofYaml()

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
