from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.neo4j.neo4j_connection_interface import Neo4jConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractNeo4jConnection(Task, Neo4jConnectionInterface):
    url: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    bearer_token: Property[str] | None = None

    def credentials(self, run_context: RunContext) -> AuthToken:
        raise NotImplementedError  # TODO: translate from Java
