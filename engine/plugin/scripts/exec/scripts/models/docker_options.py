from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\exec\scripts\models\DockerOptions.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.scripts.runner.docker.cpu import Cpu
from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.plugin.scripts.runner.docker.device_request import DeviceRequest
from engine.plugin.scripts.runner.docker.memory import Memory
from engine.core.models.property.property import Property
from engine.plugin.scripts.runner.docker.pull_policy import PullPolicy


@dataclass(slots=True, kw_only=True)
class DockerOptions:
    image: str
    pull_policy: Property[PullPolicy] = Property.ofValue(PullPolicy.IF_NOT_PRESENT)
    host: str | None = None
    config: Any | None = None
    credentials: Credentials | None = None
    user: str | None = None
    entry_point: list[str] | None = None
    extra_hosts: list[str] | None = None
    network_mode: str | None = None
    volumes: list[str] | None = None
    device_requests: list[DeviceRequest] | None = None
    cpu: Cpu | None = None
    memory: Memory | None = None
    shm_size: str | None = None
    privileged: Property[bool] | None = None
