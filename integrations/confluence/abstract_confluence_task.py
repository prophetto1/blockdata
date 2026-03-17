from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-confluence\src\main\java\io\kestra\plugin\confluence\AbstractConfluenceTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConfluenceTask(ABC, Task):
    server_url: Property[str]
    username: Property[str]
    api_token: Property[str]
