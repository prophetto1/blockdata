from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-trello\src\main\java\io\kestra\plugin\trello\AbstractTrelloTask.java
# WARNING: Unresolved types: Exception, HttpRequestBuilder, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTrelloTask(ABC, Task):
    api_key: Property[str]
    api_token: Property[str]
    api_version: Property[str] = Property.ofValue("1")
    api_base_url: Property[str] = Property.ofValue("https://api.trello.com")

    def build_api_url(self, run_context: RunContext, endpoint: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def add_auth_headers(self, run_context: RunContext, builder: HttpRequest.HttpRequestBuilder) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java
