from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\models\PodStatus.java
# WARNING: Unresolved types: ContainerStatus, PodCondition, PodIP, api, fabric8, io, kubernetes, model

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class PodStatus:
    conditions: list[PodCondition] | None = None
    container_statuses: list[ContainerStatus] | None = None
    ephemeral_container_statuses: list[ContainerStatus] | None = None
    host_i_p: str | None = None
    init_container_statuses: list[ContainerStatus] | None = None
    message: str | None = None
    nominated_node_name: str | None = None
    phase: str | None = None
    pod_i_p: str | None = None
    pod_i_ps: list[PodIP] | None = None
    qos_class: str | None = None
    reason: str | None = None
    start_time: datetime | None = None
    additional_properties: dict[str, Any] | None = None

    @staticmethod
    def from(pod_status: io.fabric8.kubernetes.api.model.PodStatus) -> PodStatus:
        raise NotImplementedError  # TODO: translate from Java
