from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\function\HttpFunction.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class HttpFunction(AbstractTask):
    """Invoke an authenticated Cloud Run function"""
    http_method: Property[str]
    url: Property[str]
    http_body: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def wrap_response_exception(self, e: HttpClientResponseException) -> HttpClientResponseException:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        response_body: Any | None = None
