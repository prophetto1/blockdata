from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cassandra\src\main\java\io\kestra\plugin\cassandra\astradb\Query.java
# WARNING: Unresolved types: CqlSession

from dataclasses import dataclass
from typing import Any

from integrations.cassandra.abstract_query import AbstractQuery
from integrations.cassandra.astradb.astra_db_session import AstraDbSession
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Query(AbstractQuery):
    """Run a CQL query on Astra DB"""
    session: AstraDbSession

    def cql_session(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java
