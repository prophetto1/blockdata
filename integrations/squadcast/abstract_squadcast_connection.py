from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-squadcast\src\main\java\io\kestra\plugin\squadcast\AbstractSquadcastConnection.java
# WARNING: Unresolved types: Charset, HttpRequestBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AbstractSquadcastConnection(ABC, Task):
    options: RequestOptions | None = None

    def http_client_configuration_with_options(self) -> HttpConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def create_request_builder(self, run_context: RunContext) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RequestOptions:
        read_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
        read_idle_timeout: Property[timedelta] = Property.ofValue(Duration.of(5, ChronoUnit.MINUTES))
        connection_pool_idle_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(0))
        max_content_length: Property[int] = Property.ofValue(1024 * 1024 * 10)
        default_charset: Property[Charset] = Property.ofValue(StandardCharsets.UTF_8)
        connect_timeout: Property[timedelta] | None = None
        headers: Property[dict[str, str]] | None = None
