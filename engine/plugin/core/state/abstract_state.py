from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\state\AbstractState.java
# WARNING: Unresolved types: IOException, Pair, TypeReference

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractState(Task):
    t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[dict[str, Any]] = new TypeReference<>() {}
    t_a_s_k_s__s_t_a_t_e_s: str = "tasks-states"
    name: Property[str] = Property.ofValue("default")
    namespace: Property[bool] = Property.ofValue(false)
    taskrun_value: Property[bool] = Property.ofValue(true)

    def get(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def merge(self, run_context: RunContext, map: dict[str, Any]) -> Pair[str, dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def task_run_value(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
