from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class CassandraDbSession:
    endpoints: list[Endpoint] | None = None
    local_datacenter: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    application_name: Property[str] | None = None
    secure_connection: SecureConnection | None = None

    def connect(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Endpoint:
        hostname: str
        port: Property[int]
        server_name: Property[str] | None = None

    @dataclass(slots=True)
    class SecureConnection:
        truststore_path: Property[str] | None = None
        truststore_password: Property[str] | None = None
        keystore_path: Property[str] | None = None
        keystore_password: Property[str] | None = None

        def configure(self, builder: CqlSessionBuilder, run_context: RunContext) -> None:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Endpoint:
    hostname: str
    port: Property[int]
    server_name: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class SecureConnection:
    truststore_path: Property[str] | None = None
    truststore_password: Property[str] | None = None
    keystore_path: Property[str] | None = None
    keystore_password: Property[str] | None = None

    def configure(self, builder: CqlSessionBuilder, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
