from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from integrations.pipedrive.models.pipedrive_response import PipedriveResponse


@dataclass(slots=True, kw_only=True)
class PipedriveClient(Closeable):
    d_e_f_a_u_l_t__b_a_s_e__u_r_l: str | None = None
    http_client: HttpClient | None = None
    object_mapper: com | None = None
    api_token: str | None = None
    logger: Logger | None = None
    base_url: str | None = None

    def get(self, endpoint: str, type_ref: TypeReference[PipedriveResponse[T]]) -> PipedriveResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def post(self, endpoint: str, body: Any, type_ref: TypeReference[PipedriveResponse[T]]) -> PipedriveResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def put(self, endpoint: str, body: Any, type_ref: TypeReference[PipedriveResponse[T]]) -> PipedriveResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, endpoint: str, type_ref: TypeReference[PipedriveResponse[T]]) -> PipedriveResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def execute_request(self, request: HttpRequest, type_ref: TypeReference[PipedriveResponse[T]]) -> PipedriveResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def build_url(self, endpoint: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
