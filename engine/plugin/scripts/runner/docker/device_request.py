from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\DeviceRequest.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class DeviceRequest:
    """A request for devices to be sent to device drivers."""
    driver: Property[str] | None = None
    count: Property[int] | None = None
    device_ids: Property[list[str]] | None = None
    capabilities: Property[list[list[str]]] | None = None
    options: Property[dict[str, str]] | None = None
