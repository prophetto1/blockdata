from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\http\AbstractHttp.java
# WARNING: Unresolved types: MalformedURLException, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.plugin.core.http.http_interface import HttpInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractHttp(ABC, Task):
    uri: Property[str]
    method: Property[str]
    content_type: Property[str]
    options: HttpConfiguration
    logger: ClassVar[Logger] = getLogger(__name__)
    body: Property[str] | None = None
    form_data: Property[dict[str, Any]] | None = None
    params: Property[dict[str, Any]] | None = None
    headers: Property[dict[str, str]] | None = None
    allow_failed: Property[bool] | None = None
    ssl_options: SslOptions | None = None

    def ssl_options(self, ssl_options: SslOptions) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java
