from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cassandra\src\main\java\io\kestra\plugin\cassandra\astradb\Trigger.java
# WARNING: Unresolved types: CqlSession, Exception

from dataclasses import dataclass
from typing import Any

from integrations.cassandra.abstract_c_q_l_trigger import AbstractCQLTrigger
from integrations.cassandra.abstract_query import AbstractQuery
from integrations.cassandra.astradb.astra_db_session import AstraDbSession
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from integrations.cassandra.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractCQLTrigger):
    """Trigger flow when Astra DB query returns data"""
    session: AstraDbSession

    def run_query(self, run_context: RunContext) -> AbstractQuery.Output:
        raise NotImplementedError  # TODO: translate from Java

    def cql_session(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java
