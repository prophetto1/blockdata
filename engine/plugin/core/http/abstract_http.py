from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\http\AbstractHttp.java
# WARNING: Unresolved types: CharSequence, IOException, MalformedURLException, URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.plugin.core.http.http_interface import HttpInterface
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractHttp(Task):
    uri: Property[str]
    method: Property[str] = Property.ofValue("GET")
    content_type: Property[str] = Property.ofValue("application/json")
    options: HttpConfiguration = HttpConfiguration.builder().build()
    body: Property[str] | None = None
    form_data: Property[dict[str, Any]] | None = None
    params: Property[dict[str, Any]] | None = None
    headers: Property[dict[CharSequence, CharSequence]] | None = None
    allow_failed: Property[bool] | None = None
    ssl_options: SslOptions | None = None

    def ssl_options(self, ssl_options: SslOptions) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java
