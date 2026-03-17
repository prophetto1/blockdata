from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-flink\src\main\java\io\kestra\plugin\flink\SubmitSql.java
# WARNING: Unresolved types: Exception, IOException, InterruptedException, ObjectMapper, RuntimeException, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class SubmitSql(Task):
    """Execute SQL via Flink SQL Gateway"""
    gateway_url: Property[str]
    statement: Property[str]
    j_s_o_n: ClassVar[ObjectMapper] = new ObjectMapper()
    connection_timeout: Property[int] = Property.of(30)
    statement_timeout: Property[int] = Property.of(300)
    session_name: Property[str] | None = None
    session_config: Property[SessionConfig] | None = None
    acceptable_states: Property[java.util.List[str]] | None = None

    def run(self, run_context: RunContext) -> SubmitSql.Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_or_get_session(self, run_context: RunContext, gateway_url: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def execute_statement(self, run_context: RunContext, gateway_url: str, session_handle: str, statement: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_operation_completion(self, run_context: RunContext, gateway_url: str, session_handle: str, operation_handle: str) -> OperationResult:
        raise NotImplementedError  # TODO: translate from Java

    def close_session(self, run_context: RunContext, gateway_url: str, session_handle: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def extract_session_handle_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_operation_handle_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_status_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_row_count_from_response(self, response_body: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def find_session_by_name(self, sessions_list_body: str, session_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_acceptable_states(self, run_context: RunContext) -> java.util.List[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SessionConfig:
        catalog: str | None = None
        database: str | None = None
        configuration: dict[str, str] | None = None

    @dataclass(slots=True)
    class OperationResult:
        status: str | None = None
        row_count: int | None = None

    @dataclass(slots=True)
    class Output:
        operation_handle: str | None = None
        session_handle: str | None = None
        result_count: int | None = None
        status: str | None = None

    @dataclass(slots=True)
    class NonRetriableOperationException(RuntimeException):
        pass
