from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractDocker(Task):
    host: Property[str] | None = None
    config: Any | None = None
    credentials: Credentials | None = None
