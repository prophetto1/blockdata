from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta
from pathlib import Path

from integrations.kubernetes.models.connection import Connection
from engine.core.utils.retry_utils import RetryUtils
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PodService:
    c_o_m_p_l_e_t_e_d__p_h_a_s_e_s: list[String] | None = None

    def client(self, run_context: RunContext, connection: Connection) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, config: Config) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_init_container_running(self, client: KubernetesClient, pod: Pod, container: str, wait_until_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_pod_ready(self, client: KubernetesClient, pod: Pod, wait_until_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_containers_started_or_completed(self, client: KubernetesClient, pod: Pod, wait_until_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion_except(self, client: KubernetesClient, logger: Logger, pod: Pod, wait_running: timedelta, except: str) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion(self, client: KubernetesClient, logger: Logger, pod: Pod, wait_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion(self, client: KubernetesClient, logger: Logger, pod: Pod, wait_running: timedelta, condition: Predicate[Pod]) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def failed_message(self, pod: Pod) -> IllegalStateException:
        raise NotImplementedError  # TODO: translate from Java

    def check_container_failures(self, pod: Pod, except_container: str, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pod_ref(self, client: KubernetesClient, pod: Pod) -> PodResource:
        raise NotImplementedError  # TODO: translate from Java

    def with_retries(self, logger: Logger, where: str, call: RetryUtils) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def upload_marker(self, run_context: RunContext, pod_resource: PodResource, logger: Logger, marker: str, container: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def temp_dir(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java
