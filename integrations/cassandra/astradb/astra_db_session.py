from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AstraDbSession:
    secure_bundle: Property[str] | None = None
    proxy_address: ProxyAddress | None = None
    keyspace: Property[str]
    client_id: Property[str]
    client_secret: Property[str]

    def connect(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ProxyAddress:
        hostname: str
        port: Property[int]


@dataclass(slots=True, kw_only=True)
class ProxyAddress:
    hostname: str
    port: Property[int]
