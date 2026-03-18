from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-surrealdb\src\main\java\io\kestra\plugin\surrealdb\SurrealDBConnection.java
# WARNING: Unresolved types: SurrealConnection, SyncSurrealDriver

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.surrealdb.surreal_d_b_connection_interface import SurrealDBConnectionInterface
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class SurrealDBConnection(ABC, Task):
    host: str
    namespace: str
    database: str
    use_tls: Property[bool] = Property.ofValue(false)
    port: int = 8000
    connection_timeout: int = 60
    username: Property[str] | None = None
    password: Property[str] | None = None
    connection: SurrealConnection | None = None

    def connect(self, run_context: RunContext) -> SyncSurrealDriver:
        raise NotImplementedError  # TODO: translate from Java

    def disconnect(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def use_database(self, driver: SyncSurrealDriver, context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def sign_in(self, driver: SyncSurrealDriver, context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
