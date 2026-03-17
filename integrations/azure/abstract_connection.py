from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConnection(Task, AbstractConnectionInterface):
    endpoint: Property[str]
