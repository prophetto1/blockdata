from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\QueryInterface.java

from typing import Any, Protocol

from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class QueryInterface(Protocol):
    def get_sql(self) -> Property[str]: ...

    def get_legacy_sql(self) -> Property[bool]: ...

    def is_fetch(self) -> bool: ...

    def is_store(self) -> bool: ...

    def is_fetch_one(self) -> bool: ...

    def get_fetch_type(self) -> Property[FetchType]: ...

    def compute_fetch_type(self, run_context: RunContext) -> FetchType: ...
