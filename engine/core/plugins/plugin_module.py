from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginModule.java
# WARNING: Unresolved types: SimpleModule

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginModule(SimpleModule):
    serial_version_uid: ClassVar[int] = 1
    name: ClassVar[str] = "kestra-plugin"
