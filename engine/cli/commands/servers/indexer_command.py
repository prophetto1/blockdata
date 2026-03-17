from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\IndexerCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.commands.servers.abstract_server_command import AbstractServerCommand
from engine.core.services.ignore_execution_service import IgnoreExecutionService


@dataclass(slots=True, kw_only=True)
class IndexerCommand(AbstractServerCommand):
    ignore_indexer_records: list[str] = Collections.emptyList()
    application_context: ApplicationContext | None = None
    ignore_execution_service: IgnoreExecutionService | None = None
    skip_indexer_records: list[str] | None = None

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
