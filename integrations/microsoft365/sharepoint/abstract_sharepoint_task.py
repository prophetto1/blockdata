from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\AbstractSharepointTask.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.microsoft365.sharepoint.sharepoint_connection import SharepointConnection
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSharepointTask(ABC, Task):
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    site_id: Property[str]
    drive_id: Property[str] | None = None

    def connection(self, run_context: RunContext) -> SharepointConnection:
        raise NotImplementedError  # TODO: translate from Java
