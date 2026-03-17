from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cassandra.abstract_c_q_l_trigger import AbstractCQLTrigger
from integrations.influxdb.abstract_query import AbstractQuery
from integrations.cassandra.astradb.astra_db_session import AstraDbSession
from integrations.surrealdb.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractCQLTrigger, QueryInterface):
    """Trigger flow when Astra DB query returns data"""
    session: AstraDbSession

    def run_query(self, run_context: RunContext) -> AbstractQuery:
        raise NotImplementedError  # TODO: translate from Java

    def cql_session(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java
