from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\http\Request.java
# WARNING: Unresolved types: Exception, GeneralSecurityException, IOException, URISyntaxException, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.http.abstract_http import AbstractHttp
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Request(AbstractHttp):
    """Send an HTTP request and capture the response."""
    encrypt_body: Property[bool]
    max_output_body_bytes: ClassVar[int] = 19 * 1024 * 1024

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_response_bytes(response: HttpResponse[list[int]]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, run_context: RunContext, request: HttpRequest, response: HttpResponse[list[int]], body: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        code: int | None = None
        headers: dict[str, list[str]] | None = None
        body: Any | None = None
        encrypted_body: EncryptedString | None = None
        form_data: dict[str, Any] | None = None
