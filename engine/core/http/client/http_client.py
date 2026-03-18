from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\HttpClient.java
# WARNING: Unresolved types: ApacheHttpClientContext, BasicCredentialsProvider, CloseableHttpClient, DefaultApacheHttpClientObservationConvention, HttpClientContext, HttpClientResponseHandler, HttpEntity, KeyValues, ObservationRegistry, ParseException, SSLConnectionSocketFactory, Void, apache, core5, hc, org

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import timedelta
from typing import Any, Callable, ClassVar

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_sse_event import HttpSseEvent
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class HttpClient:
    logger: ClassVar[Logger] = getLogger(__name__)
    client: CloseableHttpClient | None = None
    default_credentials_provider: BasicCredentialsProvider | None = None
    run_context: RunContext | None = None
    configuration: HttpConfiguration | None = None
    observation_registry: ObservationRegistry | None = None

    def create_client(self) -> CloseableHttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def self_signed_connection_socket_factory(self) -> SSLConnectionSocketFactory:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, request: HttpRequest, http_client_context: HttpClientContext | None = None, response_handler: HttpClientResponseHandler[HttpResponse[T]] | None = None) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def sse_request(self, request: HttpRequest, cls: type[T], event_consumer: Callable[HttpSseEvent[T]]) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_sse(self, input_stream: Any, cls: type[T], event_consumer: Callable[HttpSseEvent[T]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def strip_leading_space(value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def send_sse_data(self, cls: type[T], event_consumer: Callable[HttpSseEvent[T]], data_buffer: str, event_id: str, event_name: str, comment: str, retry: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def client_context(self, request: HttpRequest) -> HttpClientContext:
        raise NotImplementedError  # TODO: translate from Java

    def throw_if_response_not_allowed(self, response: org.apache.hc.core5.http.HttpResponse, context: HttpClientContext, allow_failed: bool, allowed_response_codes: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_allowed_status_code(status_code: int, allow_failed: bool, allowed_response_codes: list[int]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def body_handler(self, cls: type[Any], entity: HttpEntity) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CustomApacheHttpClientObservationConvention(DefaultApacheHttpClientObservationConvention):

        def get_low_cardinality_key_values(self, context: ApacheHttpClientContext) -> KeyValues:
            raise NotImplementedError  # TODO: translate from Java
