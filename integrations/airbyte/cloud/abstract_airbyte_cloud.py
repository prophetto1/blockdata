from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.utils.retry_utils import RetryUtils
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAirbyteCloud(Task):
    d_e_f_a_u_l_t__t_o_k_e_n__u_r_l: str | None = None
    token: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    token_u_r_l: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None

    def client(self, run_context: RunContext) -> Airbyte:
        raise NotImplementedError  # TODO: translate from Java

    def validate(self, response: HttpResponse[InputStream]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CustomHttpClient(SpeakeasyHTTPClient):
        retry: RetryUtils | None = None

        def send(self, request: HttpRequest) -> HttpResponse[InputStream]:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class CustomHttpClient(SpeakeasyHTTPClient):
    retry: RetryUtils | None = None

    def send(self, request: HttpRequest) -> HttpResponse[InputStream]:
        raise NotImplementedError  # TODO: translate from Java
