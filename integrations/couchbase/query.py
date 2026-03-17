from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.couchbase.couchbase_connection import CouchbaseConnection
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from integrations.surrealdb.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(CouchbaseConnection, RunnableTask, QueryInterface):
    """Run Couchbase N1QL and capture results"""
    m_a_p__t_y_p_e__r_e_f: TypeRef[Map[String, Object]] | None = None
    fetch_type: Property[FetchType]
    parameters: Any | None = None
    query: str

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_parameters_for_query(self) -> QueryOptions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        rows: list[Map[String, Object]] | None = None
        row: dict[String, Object] | None = None
        uri: str | None = None
        size: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    rows: list[Map[String, Object]] | None = None
    row: dict[String, Object] | None = None
    uri: str | None = None
    size: int | None = None
