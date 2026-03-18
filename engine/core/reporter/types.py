from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\Types.java

from enum import Enum
from typing import Any

from engine.core.models.flows.type import Type


class Types(str, Enum):
    USAGE = "USAGE"
    SYSTEM_INFORMATION = "SYSTEM_INFORMATION"
    PLUGIN_METRICS = "PLUGIN_METRICS"
    SERVICE_USAGE = "SERVICE_USAGE"
    PLUGIN_USAGE = "PLUGIN_USAGE"
