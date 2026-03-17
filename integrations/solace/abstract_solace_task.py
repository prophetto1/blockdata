from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\AbstractSolaceTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from integrations.solace.solace_connection_interface import SolaceConnectionInterface
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSolaceTask(ABC, Task):
    vpn: Property[str] = Property.ofValue("default")
    properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    username: Property[str] | None = None
    password: Property[str] | None = None
    host: Property[str] | None = None
