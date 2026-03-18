from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-huggingface\src\main\java\io\kestra\plugin\huggingface\AbstractHttpTask.java
# WARNING: Unresolved types: Charset

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractHttpTask(ABC, Task):
    options: RequestOptions | None = None

    def http_client_configuration_with_options(self) -> HttpConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RequestOptions:
        read_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
        read_idle_timeout: Property[timedelta] = Property.ofValue(Duration.of(5, ChronoUnit.MINUTES))
        connection_pool_idle_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(0))
        max_content_length: Property[int] = Property.ofValue(1024 * 1024 * 10)
        default_charset: Property[Charset] = Property.ofValue(StandardCharsets.UTF_8)
        connect_timeout: Property[timedelta] | None = None
