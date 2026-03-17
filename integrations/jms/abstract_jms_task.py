from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.jms.configuration.connection_factory_config import ConnectionFactoryConfig
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractJmsTask(Task):
    connection_factory_config: ConnectionFactoryConfig | None = None

    def create_connection(self, run_context: RunContext) -> ConnectionAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def close_quietly(self, closeable: AutoCloseable) -> None:
        raise NotImplementedError  # TODO: translate from Java
