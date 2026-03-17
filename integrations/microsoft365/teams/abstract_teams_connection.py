from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AbstractTeamsConnection(Task, RunnableTask):
    options: RequestOptions | None = None

    def http_client_configuration_with_options(self) -> HttpConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def create_request_builder(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RequestOptions:
        connect_timeout: Property[timedelta] | None = None
        read_timeout: Property[timedelta] | None = None
        read_idle_timeout: Property[timedelta] | None = None
        connection_pool_idle_timeout: Property[timedelta] | None = None
        max_content_length: Property[int] | None = None
        default_charset: Property[Charset] | None = None
        headers: Property[dict[String, String]] | None = None


@dataclass(slots=True, kw_only=True)
class RequestOptions:
    connect_timeout: Property[timedelta] | None = None
    read_timeout: Property[timedelta] | None = None
    read_idle_timeout: Property[timedelta] | None = None
    connection_pool_idle_timeout: Property[timedelta] | None = None
    max_content_length: Property[int] | None = None
    default_charset: Property[Charset] | None = None
    headers: Property[dict[String, String]] | None = None
