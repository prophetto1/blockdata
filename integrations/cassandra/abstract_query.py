from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cassandra\src\main\java\io\kestra\plugin\cassandra\AbstractQuery.java
# WARNING: Unresolved types: ColumnDefinition, ColumnDefinitions, Exception, GettableByIndex, Row, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.cassandra.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractQuery(ABC, Task):
    fetch: Property[bool] = Property.ofValue(false)
    store: Property[bool] = Property.ofValue(false)
    fetch_one: Property[bool] = Property.ofValue(false)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    cql: Property[str] | None = None

    def run(self, run_context: RunContext) -> AbstractQuery.Output:
        raise NotImplementedError  # TODO: translate from Java

    def compute_fetch_type(self, run_context: RunContext) -> FetchType:
        raise NotImplementedError  # TODO: translate from Java

    def convert_row(self, row: Row, column_definitions: ColumnDefinitions) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_cell(self, column_definition: ColumnDefinition, row: GettableByIndex, index: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        row: dict[str, Any] | None = None
        rows: list[dict[str, Any]] | None = None
        uri: str | None = None
        size: int | None = None
        bytes: int | None = None
