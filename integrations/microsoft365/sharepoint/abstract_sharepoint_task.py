from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.microsoft365.sharepoint.sharepoint_connection import SharepointConnection
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSharepointTask(Task):
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    site_id: Property[str]
    drive_id: Property[str] | None = None

    def connection(self, run_context: RunContext) -> SharepointConnection:
        raise NotImplementedError  # TODO: translate from Java
