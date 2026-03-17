from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginConfiguration.java
# WARNING: Unresolved types: Comparator

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PluginConfiguration:
    c_o_m_p_a_r_a_t_o_r: Comparator[PluginConfiguration] = Comparator.comparing(PluginConfiguration::order)
    order: int | None = None
    type: str | None = None
    values: dict[str, Any] | None = None
