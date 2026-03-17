from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\AbstractJmsTask.java
# WARNING: Unresolved types: AutoCloseable, ConnectionAdapter, Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.jms.configuration.connection_factory_config import ConnectionFactoryConfig
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractJmsTask(ABC, Task):
    connection_factory_config: ConnectionFactoryConfig | None = None

    def create_connection(self, run_context: RunContext) -> ConnectionAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def close_quietly(self, closeable: AutoCloseable) -> None:
        raise NotImplementedError  # TODO: translate from Java
