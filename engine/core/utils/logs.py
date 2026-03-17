from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Logs.java
# WARNING: Unresolved types: Level, Logger

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class Logs:
    f_l_o_w__p_r_e_f_i_x__w_i_t_h__t_e_n_a_n_t: str = "[tenant: {}] [namespace: {}] [flow: {}] "
    e_x_e_c_u_t_i_o_n__p_r_e_f_i_x__w_i_t_h__t_e_n_a_n_t: str = FLOW_PREFIX_WITH_TENANT + "[execution: {}] "
    t_r_i_g_g_e_r__p_r_e_f_i_x__w_i_t_h__t_e_n_a_n_t: str = FLOW_PREFIX_WITH_TENANT + "[trigger: {}] "
    t_a_s_k_r_u_n__p_r_e_f_i_x__w_i_t_h__t_e_n_a_n_t: str = FLOW_PREFIX_WITH_TENANT + "[task: {}] [execution: {}] [taskrun: {}] "

    @staticmethod
    def log_execution(flow: FlowId, logger: Logger, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_execution(execution: Execution, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_execution(execution: Execution, logger: Logger, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_trigger(trigger_context: TriggerContext, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_trigger(trigger_context: TriggerContext, logger: Logger, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_task_run(task_run: TaskRun, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def logger(task_run: TaskRun) -> Logger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def logger(trigger_context: TriggerContext) -> Logger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def logger(execution: Execution) -> Logger:
        raise NotImplementedError  # TODO: translate from Java
