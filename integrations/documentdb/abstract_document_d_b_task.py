from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\AbstractDocumentDBTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractDocumentDBTask(ABC, Task):
    host: Property[str]
    database: Property[str]
    collection: Property[str]
    username: Property[str]
    password: Property[str]
