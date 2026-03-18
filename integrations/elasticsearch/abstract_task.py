from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\AbstractTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.elasticsearch_connection import ElasticsearchConnection
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    connection: ElasticsearchConnection
    routing: Property[str] | None = None
