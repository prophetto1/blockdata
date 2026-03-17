from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from integrations.solace.solace_connection_interface import SolaceConnectionInterface
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSolaceTask(Task, SolaceConnectionInterface):
    username: Property[str] | None = None
    password: Property[str] | None = None
    vpn: Property[str] | None = None
    host: Property[str] | None = None
    properties: Property[dict[String, String]] | None = None
