from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\AbstractOneShareTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.abstract_graph_connection import AbstractGraphConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractOneShareTask(ABC, AbstractGraphConnection):
    drive_id: Property[str]
