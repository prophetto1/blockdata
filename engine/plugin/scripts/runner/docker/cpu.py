from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\Cpu.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Cpu:
    cpus: Property[float] | None = None
