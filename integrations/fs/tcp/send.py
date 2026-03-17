from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from integrations.fs.tcp.tcp_service import TcpService


@dataclass(slots=True, kw_only=True)
class Send(Task, RunnableTask):
    """Send data to a TCP server"""
    tcp_service: TcpService | None = None
    host: Property[str]
    port: Property[int]
    payload: Property[str]
    encoding: Property[str] | None = None
    timeout: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        host: str | None = None
        port: int | None = None
        sent_bytes: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    host: str | None = None
    port: int | None = None
    sent_bytes: int | None = None
