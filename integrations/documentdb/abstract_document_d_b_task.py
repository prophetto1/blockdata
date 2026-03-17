from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractDocumentDBTask(Task):
    host: Property[str]
    database: Property[str]
    collection: Property[str]
    username: Property[str]
    password: Property[str]
