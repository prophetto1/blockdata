from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\services\PodService.java
# WARNING: Unresolved types: CheckedSupplier, Config, IOException, IllegalStateException, KubernetesClient, Logger, Pod, PodResource, Predicate

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from datetime import timedelta
from typing import Any, ClassVar

from integrations.kubernetes.models.connection import Connection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.utils.retry_utils import RetryUtils
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PodService(ABC):
    c_o_m_p_l_e_t_e_d__p_h_a_s_e_s: ClassVar[list[str]] = List.of("Succeeded", "Failed", "Unknown")

    @staticmethod
    def client(run_context: RunContext, connection: Connection) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def client(config: Config) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wait_for_init_container_running(client: KubernetesClient, pod: Pod, container: str, wait_until_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wait_for_pod_ready(client: KubernetesClient, pod: Pod, wait_until_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wait_for_containers_started_or_completed(client: KubernetesClient, pod: Pod, wait_until_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wait_for_completion_except(client: KubernetesClient, logger: Logger, pod: Pod, wait_running: timedelta, except: str) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wait_for_completion(client: KubernetesClient, logger: Logger, pod: Pod, wait_running: timedelta) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wait_for_completion(client: KubernetesClient, logger: Logger, pod: Pod, wait_running: timedelta, condition: Predicate[Pod]) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def failed_message(pod: Pod) -> IllegalStateException:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def check_container_failures(pod: Pod, except_container: str, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def pod_ref(client: KubernetesClient, pod: Pod) -> PodResource:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def with_retries(logger: Logger, where: str, call: RetryUtils.CheckedSupplier[bool]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def upload_marker(run_context: RunContext, pod_resource: PodResource, logger: Logger, marker: str, container: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def temp_dir(run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java
