from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.core.http.abstract_http import AbstractHttp
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Request(AbstractHttp, RunnableTask):
    """Execute a GraphQL HTTP request"""
    encrypt_body: Property[bool] | None = None
    query: Property[str]
    variables: Property[dict[String, Object]] | None = None
    operation_name: Property[str] | None = None
    method: Property[str] | None = None
    fail_on_graph_q_l_errors: Property[bool] | None = None

    def request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, run_context: RunContext, request: HttpRequest, response: HttpResponse[String], body: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        code: int | None = None
        headers: dict[String, List[String]] | None = None
        body: Any | None = None
        error: Any | None = None
        encrypted_body: EncryptedString | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    code: int | None = None
    headers: dict[String, List[String]] | None = None
    body: Any | None = None
    error: Any | None = None
    encrypted_body: EncryptedString | None = None
