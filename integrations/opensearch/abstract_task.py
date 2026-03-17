from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.opensearch_connection import OpensearchConnection
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):
    connection: OpensearchConnection
    routing: Property[str] | None = None
