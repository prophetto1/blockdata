from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from integrations.kubernetes.services.logging_output_stream import LoggingOutputStream
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PodLogService(AutoCloseable):
    pod_logs: list[LogWatch] | None = None
    scheduled_executor: ScheduledExecutorService | None = None
    scheduled_future: ScheduledFuture[Any] | None = None
    output_stream: LoggingOutputStream | None = None
    thread: Thread | None = None
    clock: Clock | None = None
    refresh_interval: int | None = None

    def watch(self, client: KubernetesClient, pod: Pod, log_consumer: AbstractLogConsumer, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_final_logs(self, client: KubernetesClient, pod: Pod, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
