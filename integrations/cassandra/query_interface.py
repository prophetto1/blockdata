from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cassandra\src\main\java\io\kestra\plugin\cassandra\QueryInterface.java
# WARNING: Unresolved types: CqlSession

from typing import Any, Protocol

from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class QueryInterface(Protocol):
    def get_cql(self) -> Property[str]: ...

    def get_fetch(self) -> Property[bool]: ...

    def get_store(self) -> Property[bool]: ...

    def get_fetch_one(self) -> Property[bool]: ...

    def get_fetch_type(self) -> Property[FetchType]: ...

    def cql_session(self, run_context: RunContext) -> CqlSession: ...
