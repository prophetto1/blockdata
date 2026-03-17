from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-todoist\src\main\java\io\kestra\plugin\todoist\AbstractTodoistTask.java
# WARNING: Unresolved types: Exception, HttpRequestBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTodoistTask(ABC, Task):
    api_token: Property[str]
    b_a_s_e__u_r_l: ClassVar[str] = "https://api.todoist.com/api/v1"

    def create_request_builder(self, token: str, url: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def send_request(self, run_context: RunContext, request: HttpRequest) -> HttpResponse[str]:
        raise NotImplementedError  # TODO: translate from Java
