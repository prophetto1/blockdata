from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gitlab\src\main\java\io\kestra\plugin\gitlab\AbstractGitLabTask.java
# WARNING: Unresolved types: HttpRequestBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractGitLabTask(ABC, Task):
    token: Property[str]
    project_id: Property[str]
    url: Property[str] = Property.ofValue("https://gitlab.com")
    api_path: Property[str] = Property.ofValue("/api/v4/projects")

    def http_client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def authenticated_request_builder(self, endpoint: str, run_context: RunContext) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_api_endpoint(self, resource: str, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
