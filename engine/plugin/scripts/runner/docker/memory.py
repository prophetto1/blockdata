from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\Memory.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class Memory:
    memory: Property[str] | None = None
    memory_swap: Property[str] | None = None
    memory_swappiness: Property[str] | None = None
    memory_reservation: Property[str] | None = None
    kernel_memory: Property[str] | None = None
    oom_kill_disable: Property[bool] | None = None
