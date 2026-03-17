from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\HttpResponse.java
# WARNING: Unresolved types: ClassicHttpResponse, EndpointDetails, HttpContext, HttpHeaders, SocketAddress, apache, core5, hc, org

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True, kw_only=True)
class HttpResponse:
    status: Status | None = None
    headers: HttpHeaders | None = None
    body: T | None = None
    endpoint_detail: EndpointDetail | None = None
    request: HttpRequest | None = None

    @staticmethod
    def from(http_response: ClassicHttpResponse, body: T, request: HttpRequest | None = None, context: HttpContext | None = None) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(status: Status, body: T | None = None, content_type: str | None = None) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def content_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Status:
        continue: Status
        switching_protocols: Status
        processing: Status
        early_hints: Status
        ok: Status
        created: Status
        accepted: Status
        non_authoritative_information: Status
        no_content: Status
        reset_content: Status
        partial_content: Status
        multi_status: Status
        already_imported: Status
        im_used: Status
        multiple_choices: Status
        moved_permanently: Status
        found: Status
        see_other: Status
        not_modified: Status
        use_proxy: Status
        switch_proxy: Status
        temporary_redirect: Status
        permanent_redirect: Status
        bad_request: Status
        unauthorized: Status
        payment_required: Status
        forbidden: Status
        not_found: Status
        method_not_allowed: Status
        not_acceptable: Status
        proxy_authentication_required: Status
        request_timeout: Status
        conflict: Status
        gone: Status
        length_required: Status
        precondition_failed: Status
        request_entity_too_large: Status
        request_uri_too_long: Status
        unsupported_media_type: Status
        requested_range_not_satisfiable: Status
        expectation_failed: Status
        i_am_a_teapot: Status
        enhance_your_calm: Status
        misdirected_request: Status
        unprocessable_entity: Status
        locked: Status
        failed_dependency: Status
        too_early: Status
        upgrade_required: Status
        precondition_required: Status
        too_many_requests: Status
        request_header_fields_too_large: Status
        no_response: Status
        blocked_by_windows_parental_controls: Status
        unavailable_for_legal_reasons: Status
        request_header_too_large: Status
        internal_server_error: Status
        not_implemented: Status
        bad_gateway: Status
        service_unavailable: Status
        gateway_timeout: Status
        http_version_not_supported: Status
        variant_also_negotiates: Status
        insufficient_storage: Status
        loop_detected: Status
        bandwidth_limit_exceeded: Status
        not_extended: Status
        network_authentication_required: Status
        connection_timed_out: Status
        code: int | None = None
        reason: str | None = None

        @staticmethod
        def value_of(code: int) -> Status:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EndpointDetail:
        remote_address: SocketAddress | None = None
        local_address: SocketAddress | None = None
        request_count: int | None = None
        response_count: int | None = None
        sent_bytes_count: int | None = None
        received_bytes_count: int | None = None

        @staticmethod
        def from(details: EndpointDetails) -> EndpointDetail:
            raise NotImplementedError  # TODO: translate from Java
