from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\services\PodLogService.java
# WARNING: Unresolved types: AutoCloseable, Clock, IOException, KubernetesClient, LogWatch, Pod, ScheduledExecutorService, ScheduledFuture, Thread

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from integrations.kubernetes.services.logging_output_stream import LoggingOutputStream
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PodLogService:
    pod_logs: list[LogWatch] = field(default_factory=list)
    clock: Clock = Clock.systemUTC()
    refresh_interval: int = 30
    scheduled_executor: ScheduledExecutorService | None = None
    scheduled_future: ScheduledFuture[Any] | None = None
    output_stream: LoggingOutputStream | None = None
    thread: Thread | None = None

    def watch(self, client: KubernetesClient, pod: Pod, log_consumer: AbstractLogConsumer, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_final_logs(self, client: KubernetesClient, pod: Pod, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
