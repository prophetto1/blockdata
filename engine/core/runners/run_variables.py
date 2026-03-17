from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunVariables.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property_context import PropertyContext
from engine.core.runners.run_context_logger import RunContextLogger
from engine.core.runners.secret import Secret
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class RunVariables:
    s_e_c_r_e_t__c_o_n_s_u_m_e_r__v_a_r_i_a_b_l_e__n_a_m_e: str = "addSecretConsumer"
    f_i_x_t_u_r_e__f_i_l_e_s__k_e_y: str = "io.kestra.datatype:test_fixtures_files"

    @staticmethod
    def of(task: Task) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execution_formatted_output_map(task_run: TaskRun) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(task_run: TaskRun) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow: FlowInterface) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(trigger: AbstractTrigger) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    class Builder(Protocol):
        def with_flow(self, flow: FlowInterface) -> Builder: ...

        def with_inputs(self, inputs: dict[str, Any]) -> Builder: ...

        def with_task(self, task: Task) -> Builder: ...

        def with_execution(self, execution: Execution) -> Builder: ...

        def with_task_run(self, task_run: TaskRun) -> Builder: ...

        def with_decrypt_variables(self, decrypt_variables: bool) -> Builder: ...

        def with_variables(self, variables: dict[str, Any]) -> Builder: ...

        def with_trigger(self, trigger: AbstractTrigger) -> Builder: ...

        def with_envs(self, envs: dict[str, Any]) -> Builder: ...

        def with_globals(self, globals: dict[Any, Any]) -> Builder: ...

        def with_secret_inputs(self, secret_inputs: list[str]) -> Builder: ...

        def with_kestra_configuration(self, kestra_configuration: KestraConfiguration) -> Builder: ...

        def build(self, logger: RunContextLogger, property_context: PropertyContext) -> dict[str, Any]: ...

    @dataclass(slots=True)
    class KestraConfiguration:
        environment: str | None = None
        url: str | None = None

    @dataclass(slots=True)
    class DefaultBuilder:
        decrypt_variables: bool = True
        flow: FlowInterface | None = None
        task: Task | None = None
        execution: Execution | None = None
        task_run: TaskRun | None = None
        trigger: AbstractTrigger | None = None
        variables: dict[str, Any] | None = None
        inputs: dict[str, Any] | None = None
        envs: dict[str, Any] | None = None
        globals: dict[Any, Any] | None = None
        secret_key: Optional[str] | None = None
        secret_inputs: list[str] | None = None
        kestra_configuration: KestraConfiguration | None = None

        def build(self, logger: RunContextLogger, property_context: PropertyContext) -> dict[str, Any]:
            raise NotImplementedError  # TODO: translate from Java

        def decode_input(self, secret: Secret, id: str, inputs: dict[str, Any]) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PropertyContextWithVariables:
        delegate: PropertyContext | None = None
        variables: dict[str, Any] | None = None

        def render(self, inline: str, variables: dict[str, Any]) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def render(self, inline: dict[str, Any], variables: dict[str, Any]) -> dict[str, Any]:
            raise NotImplementedError  # TODO: translate from Java
