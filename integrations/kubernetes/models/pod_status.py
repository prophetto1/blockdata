from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


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
    additional_properties: dict[String, Object] | None = None

    def from(self, pod_status: io) -> PodStatus:
        raise NotImplementedError  # TODO: translate from Java
