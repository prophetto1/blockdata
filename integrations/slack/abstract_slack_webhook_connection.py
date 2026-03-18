from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\AbstractSlackWebhookConnection.java
# WARNING: Unresolved types: Charset

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.property.property import Property
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AbstractSlackWebhookConnection(ABC, Task):
    options: RequestOptions | None = None

    @dataclass(slots=True)
    class RequestOptions:
        read_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
        read_idle_timeout: Property[timedelta] = Property.ofValue(Duration.of(5, ChronoUnit.MINUTES))
        connection_pool_idle_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(0))
        max_content_length: Property[int] = Property.ofValue(1024 * 1024 * 10)
        default_charset: Property[Charset] = Property.ofValue(StandardCharsets.UTF_8)
        connect_timeout: Property[timedelta] | None = None
        headers: Property[dict[str, str]] | None = None
