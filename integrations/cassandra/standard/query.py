from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.influxdb.abstract_query import AbstractQuery
from integrations.cassandra.standard.cassandra_db_session import CassandraDbSession
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Query(AbstractQuery):
    """Run a CQL query on Cassandra"""
    session: CassandraDbSession

    def cql_session(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java
