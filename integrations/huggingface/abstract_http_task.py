from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractHttpTask(Task):
    options: RequestOptions | None = None

    def http_client_configuration_with_options(self) -> HttpConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RequestOptions:
        connect_timeout: Property[timedelta] | None = None
        read_timeout: Property[timedelta] | None = None
        read_idle_timeout: Property[timedelta] | None = None
        connection_pool_idle_timeout: Property[timedelta] | None = None
        max_content_length: Property[int] | None = None
        default_charset: Property[Charset] | None = None


@dataclass(slots=True, kw_only=True)
class RequestOptions:
    connect_timeout: Property[timedelta] | None = None
    read_timeout: Property[timedelta] | None = None
    read_idle_timeout: Property[timedelta] | None = None
    connection_pool_idle_timeout: Property[timedelta] | None = None
    max_content_length: Property[int] | None = None
    default_charset: Property[Charset] | None = None
