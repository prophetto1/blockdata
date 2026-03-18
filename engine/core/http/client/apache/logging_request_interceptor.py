from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\apache\LoggingRequestInterceptor.java
# WARNING: Unresolved types: EntityDetails, HttpContext, HttpException, HttpRequestInterceptor, LoggingType

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.apache.abstract_logging_interceptor import AbstractLoggingInterceptor
from engine.core.http.client.configurations.http_configuration import HttpConfiguration


@dataclass(slots=True, kw_only=True)
class LoggingRequestInterceptor(AbstractLoggingInterceptor):
    logger: Any | None = None
    logs: list[HttpConfiguration.LoggingType] | None = None

    def process(self, request: HttpRequest, entity: EntityDetails, context: HttpContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_request_entry(self, request: HttpRequest) -> str:
        raise NotImplementedError  # TODO: translate from Java
