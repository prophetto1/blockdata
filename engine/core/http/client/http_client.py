from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\HttpClient.java
# WARNING: Unresolved types: ApacheHttpClientContext, BasicCredentialsProvider, Class, Closeable, CloseableHttpClient, Consumer, DefaultApacheHttpClientObservationConvention, HttpClientContext, HttpClientResponseHandler, HttpEntity, IOException, InputStream, KeyValues, ObservationRegistry, ParseException, SSLConnectionSocketFactory, StringBuilder, T, Void, apache, core5, hc, http, org

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.http.http_sse_event import HttpSseEvent
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class HttpClient:
    client: CloseableHttpClient | None = None
    default_credentials_provider: BasicCredentialsProvider | None = None
    run_context: RunContext | None = None
    configuration: HttpConfiguration | None = None
    observation_registry: ObservationRegistry | None = None

    def create_client(self) -> CloseableHttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def self_signed_connection_socket_factory(self) -> SSLConnectionSocketFactory:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, request: HttpRequest, cls: Class[T]) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, request: HttpRequest, consumer: Consumer[HttpResponse[InputStream]]) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, request: HttpRequest) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def sse_request(self, request: HttpRequest, cls: Class[T], event_consumer: Consumer[HttpSseEvent[T]]) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_sse(self, input_stream: InputStream, cls: Class[T], event_consumer: Consumer[HttpSseEvent[T]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def strip_leading_space(value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def send_sse_data(self, cls: Class[T], event_consumer: Consumer[HttpSseEvent[T]], data_buffer: StringBuilder, event_id: str, event_name: str, comment: str, retry: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def client_context(self, request: HttpRequest) -> HttpClientContext:
        raise NotImplementedError  # TODO: translate from Java

    def throw_if_response_not_allowed(self, response: org.apache.hc.core5.http.HttpResponse, context: HttpClientContext, allow_failed: bool, allowed_response_codes: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_allowed_status_code(status_code: int, allow_failed: bool, allowed_response_codes: list[int]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, request: HttpRequest, http_client_context: HttpClientContext, response_handler: HttpClientResponseHandler[HttpResponse[T]]) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def body_handler(self, cls: Class[Any], entity: HttpEntity) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CustomApacheHttpClientObservationConvention(DefaultApacheHttpClientObservationConvention):

        def get_low_cardinality_key_values(self, context: ApacheHttpClientContext) -> KeyValues:
            raise NotImplementedError  # TODO: translate from Java
