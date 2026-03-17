from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\tcp\Send.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task
from integrations.fs.tcp.tcp_service import TcpService


@dataclass(slots=True, kw_only=True)
class Send(Task):
    """Send data to a TCP server"""
    host: Property[str]
    port: Property[int]
    payload: Property[str]
    tcp_service: TcpService = TcpService.getInstance()
    encoding: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    timeout: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        host: str | None = None
        port: int | None = None
        sent_bytes: int | None = None
