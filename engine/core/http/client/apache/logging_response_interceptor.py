from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\apache\LoggingResponseInterceptor.java
# WARNING: Unresolved types: EntityDetails, HttpContext, HttpException, HttpResponseInterceptor, LoggingType

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.apache.abstract_logging_interceptor import AbstractLoggingInterceptor
from engine.core.http.client.configurations.http_configuration import HttpConfiguration


@dataclass(slots=True, kw_only=True)
class LoggingResponseInterceptor(AbstractLoggingInterceptor):
    logger: Any | None = None
    logs: list[HttpConfiguration.LoggingType] | None = None

    def process(self, response: HttpResponse, entity: EntityDetails, context: HttpContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_response_entry(response: HttpResponse) -> str:
        raise NotImplementedError  # TODO: translate from Java
