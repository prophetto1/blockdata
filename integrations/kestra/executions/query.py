from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\executions\Query.java
# WARNING: Unresolved types: ApiException, ChildFilter, Exception, KestraClient, PagedResultsExecution, StateType

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.models.tasks.common.fetch_output import FetchOutput
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.flows.flow_scope import FlowScope
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractKestraTask):
    """Search executions with filters"""
    size: Property[int] = Property.ofValue(10)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    page: Property[int] | None = None
    flow_scopes: Property[list[FlowScope]] | None = None
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    start_date: Property[datetime] | None = None
    end_date: Property[datetime] | None = None
    time_range: Property[timedelta] | None = None
    states: Property[list[StateType]] | None = None
    labels: Property[dict[str, str]] | None = None
    trigger_execution_id: Property[str] | None = None
    child_filter: Property[ExecutionRepositoryInterface.ChildFilter] | None = None

    def run(self, run_context: RunContext) -> FetchOutput:
        raise NotImplementedError  # TODO: translate from Java

    def execute_search(self, run_context: RunContext, kestra_client: KestraClient, page: int, size: int) -> PagedResultsExecution:
        raise NotImplementedError  # TODO: translate from Java
