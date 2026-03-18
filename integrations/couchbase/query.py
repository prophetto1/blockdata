from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-couchbase\src\main\java\io\kestra\plugin\couchbase\Query.java
# WARNING: Unresolved types: Exception, QueryOptions, TypeRef, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.couchbase.couchbase_connection import CouchbaseConnection
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from integrations.cassandra.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(CouchbaseConnection):
    """Run Couchbase N1QL and capture results"""
    query: str
    m_a_p__t_y_p_e__r_e_f: ClassVar[TypeRef[dict[str, Any]]] = new TypeRef<>() {}
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    parameters: Any | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_parameters_for_query(self) -> QueryOptions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
        size: int | None = None
