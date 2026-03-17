from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta


@dataclass(slots=True, kw_only=True)
class TcpService:
    instance: TcpService | None = None

    def get_instance(self) -> TcpService:
        raise NotImplementedError  # TODO: translate from Java

    def connect(self, host: str, port: int, timeout: timedelta) -> Socket:
        raise NotImplementedError  # TODO: translate from Java

    def encode_payload(self, payload: str, encoding: str) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    def decode_payload(self, bytes: byte, encoding: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
