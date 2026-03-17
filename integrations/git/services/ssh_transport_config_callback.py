from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class SshTransportConfigCallback(TransportConfigCallback):
    private_key: byte | None = None
    passphrase: str | None = None

    def configure(self, transport: Transport) -> None:
        raise NotImplementedError  # TODO: translate from Java
