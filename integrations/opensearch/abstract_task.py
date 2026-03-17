from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\AbstractTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.opensearch.opensearch_connection import OpensearchConnection
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    connection: OpensearchConnection
    routing: Property[str] | None = None
