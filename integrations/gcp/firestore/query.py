from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\firestore\Query.java
# WARNING: Unresolved types: CollectionReference, Direction, Exception, IOException, Pair, QueryDocumentSnapshot, cloud, com, firestore, google

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.firestore.abstract_firestore import AbstractFirestore
from engine.core.models.tasks.common.fetch_output import FetchOutput
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractFirestore):
    """Query documents from Firestore"""
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    order_direction: Property[Direction] = Property.ofValue(Direction.ASCENDING)
    filters: list[Filter] | None = None
    order_by: Property[str] | None = None
    offset: Property[int] | None = None
    limit: Property[int] | None = None

    def run(self, run_context: RunContext) -> FetchOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_query(self, run_context: RunContext, collection_ref: CollectionReference, filters: list[Filter]) -> com.google.cloud.firestore.Query:
        raise NotImplementedError  # TODO: translate from Java

    def append_query_part(self, run_context: RunContext, query: com.google.cloud.firestore.Query, filter: Filter) -> com.google.cloud.firestore.Query:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, documents: list[QueryDocumentSnapshot]) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, documents: list[QueryDocumentSnapshot]) -> Pair[list[Any], int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, documents: list[QueryDocumentSnapshot]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Filter:
        """A filter for the where clause"""
        field: Property[str]
        value: Property[str]
        operator: Property[QueryOperator] = Property.ofValue(QueryOperator.EQUAL_TO)

    class QueryOperator(str, Enum):
        EQUAL_TO = "EQUAL_TO"
        NOT_EQUAL_TO = "NOT_EQUAL_TO"
        LESS_THAN = "LESS_THAN"
        LESS_THAN_OR_EQUAL_TO = "LESS_THAN_OR_EQUAL_TO"
        GREATER_THAN = "GREATER_THAN"
        GREATER_THAN_OR_EQUAL_TO = "GREATER_THAN_OR_EQUAL_TO"
