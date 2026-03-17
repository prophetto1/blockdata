from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\ExecutorCommand.java
# WARNING: Unresolved types: ApplicationContext, CommandLine, CommandSpec, Exception, Model

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.commands.servers.abstract_server_command import AbstractServerCommand
from engine.core.services.ignore_execution_service import IgnoreExecutionService
from engine.core.services.start_executor_service import StartExecutorService


@dataclass(slots=True, kw_only=True)
class ExecutorCommand(AbstractServerCommand):
    ignore_executions: list[str] = Collections.emptyList()
    ignore_flows: list[str] = Collections.emptyList()
    ignore_namespaces: list[str] = Collections.emptyList()
    ignore_tenants: list[str] = Collections.emptyList()
    start_executors: list[str] = Collections.emptyList()
    not_start_executors: list[str] = Collections.emptyList()
    spec: CommandLine.Model.CommandSpec | None = None
    application_context: ApplicationContext | None = None
    ignore_execution_service: IgnoreExecutionService | None = None
    start_executor_service: StartExecutorService | None = None
    flow_path: Path | None = None
    tenant_id: str | None = None
    skip_executions: list[str] | None = None
    skip_flows: list[str] | None = None
    skip_namespaces: list[str] | None = None
    skip_tenants: list[str] | None = None

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
