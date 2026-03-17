from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\client\PipedriveClient.java
# WARNING: Unresolved types: Closeable, IOException, Logger, ObjectMapper, T, TypeReference, com, databind, fasterxml, jackson

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.pipedrive.models.pipedrive_response import PipedriveResponse
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PipedriveClient:
    d_e_f_a_u_l_t__b_a_s_e__u_r_l: ClassVar[str] = "https://api.pipedrive.com/api/v2"
    http_client: HttpClient | None = None
    object_mapper: com.fasterxml.jackson.databind.ObjectMapper | None = None
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
