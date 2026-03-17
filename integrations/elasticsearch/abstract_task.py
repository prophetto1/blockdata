from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.elasticsearch.elasticsearch_connection import ElasticsearchConnection
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):
    connection: ElasticsearchConnection
    routing: Property[str] | None = None
