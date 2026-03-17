from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginModule.java
# WARNING: Unresolved types: SimpleModule

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginModule(SimpleModule):
    serial_version_u_i_d: ClassVar[int] = 1
    n_a_m_e: ClassVar[str] = "kestra-plugin"
