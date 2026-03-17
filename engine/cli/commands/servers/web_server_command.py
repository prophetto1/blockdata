from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\WebServerCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.commands.servers.abstract_server_command import AbstractServerCommand
from engine.executor.executor_service import ExecutorService
from engine.core.utils.executors_utils import ExecutorsUtils
from engine.core.services.ignore_execution_service import IgnoreExecutionService


@dataclass(slots=True, kw_only=True)
class WebServerCommand(AbstractServerCommand):
    ignore_indexer_records: list[str]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    tutorials_disabled: bool = False
    indexer_disabled: bool = False
    pool_executor: ExecutorService | None = None
    application_context: ApplicationContext | None = None
    executors_utils: ExecutorsUtils | None = None
    ignore_execution_service: IgnoreExecutionService | None = None
    skip_indexer_records: list[str] | None = None

    def is_flow_auto_load_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
