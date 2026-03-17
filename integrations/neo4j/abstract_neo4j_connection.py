from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-neo4j\src\main\java\io\kestra\plugin\neo4j\AbstractNeo4jConnection.java
# WARNING: Unresolved types: AuthToken

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.neo4j.neo4j_connection_interface import Neo4jConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractNeo4jConnection(ABC, Task):
    url: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    bearer_token: Property[str] | None = None

    def credentials(self, run_context: RunContext) -> AuthToken:
        raise NotImplementedError  # TODO: translate from Java
