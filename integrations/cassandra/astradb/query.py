from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.influxdb.abstract_query import AbstractQuery
from integrations.cassandra.astradb.astra_db_session import AstraDbSession
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Query(AbstractQuery):
    """Run a CQL query on Astra DB"""
    session: AstraDbSession

    def cql_session(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java
