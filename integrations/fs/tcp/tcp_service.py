from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\tcp\TcpService.java
# WARNING: Unresolved types: IOException, Socket

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class TcpService:
    instance: TcpService | None = None

    @staticmethod
    def get_instance() -> TcpService:
        raise NotImplementedError  # TODO: translate from Java

    def connect(self, host: str, port: int, timeout: timedelta) -> Socket:
        raise NotImplementedError  # TODO: translate from Java

    def encode_payload(self, payload: str, encoding: str) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def decode_payload(self, bytes: list[int], encoding: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
