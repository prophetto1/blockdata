from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\HttpRequest.java
# WARNING: Unresolved types: Charset, ContentType, HttpEntity, HttpHeaders, HttpUriRequest, IOException, InetSocketAddress, InputStream, apache, core5, hc, http, org

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class HttpRequest:
    method: str = "GET"
    uri: str | None = None
    body: RequestBody | None = None
    headers: HttpHeaders | None = None
    remote_address: InetSocketAddress | None = None

    @staticmethod
    def from(request: org.apache.hc.core5.http.HttpRequest) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(uri: str) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(uri: str, headers: dict[str, list[str]]) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(uri: str, method: str, body: RequestBody) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(uri: str, method: str, body: RequestBody, headers: dict[str, list[str]]) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> HttpUriRequest:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class HttpRequestBuilder:

        def add_header(self, name: str, value: str) -> HttpRequestBuilder:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RequestBody:

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        def get_content(self) -> Any:
            raise NotImplementedError  # TODO: translate from Java

        def get_charset(self) -> Charset:
            raise NotImplementedError  # TODO: translate from Java

        def get_content_type(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def entity_content_type(self) -> ContentType:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def from(entity: HttpEntity) -> RequestBody:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class InputStreamRequestBody(RequestBody):
        content_type: str = ContentType.APPLICATION_OCTET_STREAM.getMimeType()
        charset: Charset | None = None
        content: InputStream | None = None

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(data: InputStream) -> InputStreamRequestBody:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StringRequestBody(RequestBody):
        content_type: str = ContentType.TEXT_PLAIN.getMimeType()
        charset: Charset | None = None
        content: str | None = None

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(data: str) -> StringRequestBody:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ByteArrayRequestBody(RequestBody):
        content_type: str = ContentType.APPLICATION_OCTET_STREAM.getMimeType()
        charset: Charset | None = None
        content: list[int] | None = None

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(data: list[int]) -> ByteArrayRequestBody:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class JsonRequestBody(RequestBody):
        charset: Charset | None = None
        content: Any | None = None

        def get_content_type(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(data: Any) -> JsonRequestBody:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class UrlEncodedRequestBody(RequestBody):
        charset: Charset | None = None
        content: dict[str, Any] | None = None

        def get_content_type(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(data: dict[str, Any]) -> UrlEncodedRequestBody:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MultipartRequestBody(RequestBody):
        charset: Charset | None = None
        content: dict[str, Any] | None = None

        def get_content_type(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to(self) -> HttpEntity:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(data: dict[str, Any]) -> MultipartRequestBody:
            raise NotImplementedError  # TODO: translate from Java
