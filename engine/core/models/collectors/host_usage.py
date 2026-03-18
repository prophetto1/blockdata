from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\HostUsage.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class HostUsage:
    uuid: str | None = None
    hardware: Hardware | None = None
    os: Os | None = None
    jvm: Jvm | None = None

    @staticmethod
    def of() -> HostUsage:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Hardware:
        logical_processor_count: int | None = None
        physical_processor_count: int | None = None
        max_freq: int | None = None
        memory: int | None = None
        known_vm_mac_addr: bool | None = None
        known_docker_mac_addr: bool | None = None

    @dataclass(slots=True)
    class Os:
        family: str | None = None
        version: str | None = None
        code_name: str | None = None
        build_number: str | None = None

    @dataclass(slots=True)
    class Jvm:
        name: str | None = None
        vendor: str | None = None
        version: str | None = None
