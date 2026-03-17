from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConfluenceTask(Task):
    server_url: Property[str]
    username: Property[str]
    api_token: Property[str]
