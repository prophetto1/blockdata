from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\QueryFilter.java
# WARNING: Unresolved types: Enum, T

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class QueryFilter:
    field: Field | None = None
    operation: Op | None = None
    value: Any | None = None

    def as_values(self, value: Any) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def to_dashboard_filter_builder(self, field: T, value: Any) -> AbstractFilter[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def validate_query_filters(filters: list[QueryFilter], resource: Resource) -> None:
        raise NotImplementedError  # TODO: translate from Java

    class Op(str, Enum):
        EQUALS = "EQUALS"
        NOT_EQUALS = "NOT_EQUALS"
        GREATER_THAN = "GREATER_THAN"
        LESS_THAN = "LESS_THAN"
        GREATER_THAN_OR_EQUAL_TO = "GREATER_THAN_OR_EQUAL_TO"
        LESS_THAN_OR_EQUAL_TO = "LESS_THAN_OR_EQUAL_TO"
        IN = "IN"
        NOT_IN = "NOT_IN"
        STARTS_WITH = "STARTS_WITH"
        ENDS_WITH = "ENDS_WITH"
        CONTAINS = "CONTAINS"
        REGEX = "REGEX"
        PREFIX = "PREFIX"

    class Field(str, Enum):
        QUERY = "QUERY"
        SCOPE = "SCOPE"
        NAMESPACE = "NAMESPACE"
        KIND = "KIND"
        LABELS = "LABELS"
        METADATA = "METADATA"
        FLOW_ID = "FLOW_ID"
        FLOW_REVISION = "FLOW_REVISION"
        ID = "ID"
        ASSET_ID = "ASSET_ID"
        TYPE = "TYPE"
        CREATED = "CREATED"
        UPDATED = "UPDATED"
        START_DATE = "START_DATE"
        END_DATE = "END_DATE"
        EXPIRATION_DATE = "EXPIRATION_DATE"
        STATE = "STATE"
        TIME_RANGE = "TIME_RANGE"
        TRIGGER_EXECUTION_ID = "TRIGGER_EXECUTION_ID"
        TRIGGER_ID = "TRIGGER_ID"
        TRIGGER_STATE = "TRIGGER_STATE"
        EXECUTION_ID = "EXECUTION_ID"
        TASK_ID = "TASK_ID"
        TASK_RUN_ID = "TASK_RUN_ID"
        CHILD_FILTER = "CHILD_FILTER"
        WORKER_ID = "WORKER_ID"
        EXISTING_ONLY = "EXISTING_ONLY"
        MIN_LEVEL = "MIN_LEVEL"
        PATH = "PATH"
        PARENT_PATH = "PARENT_PATH"
        VERSION = "VERSION"
        USERNAME = "USERNAME"

    class Resource(str, Enum):
        FLOW = "FLOW"
        NAMESPACE = "NAMESPACE"
        EXECUTION = "EXECUTION"
        LOG = "LOG"
        TASK = "TASK"
        TEMPLATE = "TEMPLATE"
        TRIGGER = "TRIGGER"
        USER = "USER"
        SECRET_METADATA = "SECRET_METADATA"
        KV_METADATA = "KV_METADATA"
        NAMESPACE_FILE_METADATA = "NAMESPACE_FILE_METADATA"
        ASSET = "ASSET"
        ASSET_USAGE = "ASSET_USAGE"
        ASSET_LINEAGE_EVENT = "ASSET_LINEAGE_EVENT"
        CREDENTIALS = "CREDENTIALS"

    @dataclass(slots=True)
    class FieldOp:
        name: str | None = None
        value: str | None = None
        operations: list[Operation] | None = None

    @dataclass(slots=True)
    class Operation:
        name: str | None = None
        value: str | None = None
