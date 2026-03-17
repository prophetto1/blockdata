from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.kubernetes.models.connection import Connection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConnection(Task):
    connection: Connection | None = None
    wait_until_running: Property[timedelta]
    wait_running: Property[timedelta]

    def list_options(self, run_context: RunContext) -> ListOptions:
        raise NotImplementedError  # TODO: translate from Java
