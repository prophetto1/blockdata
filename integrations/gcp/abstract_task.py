from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.gcp_interface import GcpInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task, GcpInterface):
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None
    scopes: Property[list[String]] | None = None

    def credentials(self, run_context: RunContext) -> GoogleCredentials:
        raise NotImplementedError  # TODO: translate from Java
