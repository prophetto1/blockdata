from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\services\SshTransportConfigCallback.java
# WARNING: Unresolved types: Transport, TransportConfigCallback

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class SshTransportConfigCallback:
    private_key: list[int] | None = None
    passphrase: str | None = None

    def configure(self, transport: Transport) -> None:
        raise NotImplementedError  # TODO: translate from Java
