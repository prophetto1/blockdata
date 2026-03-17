from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\contexts\KestraConfig.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class KestraConfig:
    default_system_flows_namespace: ClassVar[str] = "system"
    system_flow_namespace: str | None = None
