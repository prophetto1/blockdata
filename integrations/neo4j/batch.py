from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.neo4j.abstract_neo4j_connection import AbstractNeo4jConnection
from integrations.neo4j.neo4j_connection_interface import Neo4jConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Batch(AbstractNeo4jConnection, RunnableTask, Neo4jConnectionInterface):
    """Run Cypher batch with UNWIND"""
    from: Property[str]
    query: Property[str]
    chunk: Property[int]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        row_count: int | None = None
        updated_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    row_count: int | None = None
    updated_count: int | None = None
