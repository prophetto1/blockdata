from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\AbstractApiCommand.java
# WARNING: Unresolved types: DefaultHttpClient, HttpClientConfiguration, MutableHttpRequest, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class AbstractApiCommand(ABC, AbstractCommand):
    server: str | None = None
    headers: dict[str, str] | None = None
    user: str | None = None
    tenant_id: str | None = None
    api_token: str | None = None
    http_client_configuration: HttpClientConfiguration | None = None

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def client(self) -> DefaultHttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def request_options(self, request: MutableHttpRequest[T]) -> HttpRequest[T]:
        raise NotImplementedError  # TODO: translate from Java

    def api_uri(self, path: str, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class UpdateResult:
        id: str | None = None
        namespace: str | None = None
