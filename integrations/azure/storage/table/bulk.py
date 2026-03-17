from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\table\Bulk.java
# WARNING: Unresolved types: Exception, From, TableTransactionActionType, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.table.abstracts.abstract_table_storage import AbstractTableStorage
from integrations.datagen.data import Data
from integrations.azure.storage.table.models.entity import Entity
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Bulk(AbstractTableStorage):
    """Batch upsert Azure Table entities"""
    from: Any
    default_type: Property[TableTransactionActionType] = Property.ofValue(TableTransactionActionType.UPSERT_REPLACE)

    def run(self, run_context: RunContext) -> Bulk.Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_entity(self, run_context: RunContext, row: Any) -> Entity:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
