from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\HttpConfiguration.java
# WARNING: Unresolved types: Charset, LogLevel, Proxy

from dataclasses import dataclass
from enum import Enum
from datetime import timedelta
from typing import Any

from engine.core.http.client.configurations.abstract_auth_configuration import AbstractAuthConfiguration
from engine.core.models.property.property import Property
from engine.core.http.client.configurations.proxy_configuration import ProxyConfiguration
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.http.client.configurations.timeout_configuration import TimeoutConfiguration
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class HttpConfiguration:
    follow_redirects: Property[bool]
    allow_failed: Property[bool]
    default_charset: Property[Charset]
    timeout: TimeoutConfiguration | None = None
    proxy: ProxyConfiguration | None = None
    auth: AbstractAuthConfiguration | None = None
    ssl: SslOptions | None = None
    allowed_response_codes: Property[list[int]] | None = None
    logs: list[LoggingType] | None = None
    connect_timeout: timedelta | None = None
    read_timeout: timedelta | None = None
    proxy_type: Proxy.Type | None = None
    proxy_address: str | None = None
    proxy_port: int | None = None
    proxy_username: str | None = None
    proxy_password: str | None = None
    basic_auth_user: str | None = None
    basic_auth_password: str | None = None
    log_level: LogLevel | None = None
    read_idle_timeout: timedelta | None = None
    connection_pool_idle_timeout: timedelta | None = None
    max_content_length: int | None = None

    class LoggingType(str, Enum):
        REQUEST_HEADERS = "REQUEST_HEADERS"
        REQUEST_BODY = "REQUEST_BODY"
        RESPONSE_HEADERS = "RESPONSE_HEADERS"
        RESPONSE_BODY = "RESPONSE_BODY"

    @dataclass(slots=True)
    class HttpConfigurationBuilder:

        def connect_timeout(self, connect_timeout: timedelta) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def read_timeout(self, read_timeout: timedelta) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def proxy_type(self, proxy_type: Proxy.Type) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def proxy_address(self, proxy_address: str) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def proxy_port(self, proxy_port: int) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def proxy_username(self, proxy_username: str) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def proxy_password(self, proxy_password: str) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def basic_auth_user(self, basic_auth_user: str) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def basic_auth_password(self, basic_auth_password: str) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def log_level(self, log_level: LogLevel) -> HttpConfigurationBuilder:
            raise NotImplementedError  # TODO: translate from Java
