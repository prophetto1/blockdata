from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kvm\src\main\java\io\kestra\plugin\kvm\LibvirtConnection.java
# WARNING: Unresolved types: AutoCloseable, Connect, LibvirtException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LibvirtConnection:
    connect: Connect | None = None

    def get(self) -> Connect:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
