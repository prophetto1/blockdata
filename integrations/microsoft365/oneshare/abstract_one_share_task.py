from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.abstract_graph_connection import AbstractGraphConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractOneShareTask(AbstractGraphConnection):
    drive_id: Property[str]
