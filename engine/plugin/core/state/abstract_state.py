from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\state\AbstractState.java
# WARNING: Unresolved types: Pair, TypeReference

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractState(ABC, Task):
    type_reference: ClassVar[TypeReference[dict[str, Any]]]
    name: Property[str]
    namespace: Property[bool]
    taskrun_value: Property[bool]
    tasks_states: ClassVar[str] = "tasks-states"

    def get(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def merge(self, run_context: RunContext, map: dict[str, Any]) -> Pair[str, dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def task_run_value(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
