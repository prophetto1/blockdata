from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\ExternalPlugin.java
# WARNING: Unresolved types: CRC32

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ExternalPlugin:
    location: str | None = None
    resources: list[str] | None = None
    crc32: int | None = None

    def get_crc32(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def compute_jar_crc32(location: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def update_crc32_with_long(crc32: CRC32, reusable: list[int], val: int) -> None:
        raise NotImplementedError  # TODO: translate from Java
