from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.surrealdb.surreal_d_b_connection_interface import SurrealDBConnectionInterface
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class SurrealDBConnection(Task, SurrealDBConnectionInterface):
    use_tls: Property[bool] | None = None
    port: int = 8000
    host: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    namespace: str | None = None
    database: str | None = None
    connection_timeout: int = 60
    connection: SurrealConnection | None = None

    def connect(self, run_context: RunContext) -> SyncSurrealDriver:
        raise NotImplementedError  # TODO: translate from Java

    def disconnect(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def use_database(self, driver: SyncSurrealDriver, context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def sign_in(self, driver: SyncSurrealDriver, context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
