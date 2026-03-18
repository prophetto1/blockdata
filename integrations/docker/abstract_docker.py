from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-docker\src\main\java\io\kestra\plugin\docker\AbstractDocker.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractDocker(ABC, Task):
    host: Property[str] | None = None
    config: Any | None = None
    credentials: Credentials | None = None
