from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\service\publisher\DeliveryModes.java

from enum import Enum
from typing import Any


class DeliveryModes(str, Enum):
    DIRECT = "DIRECT"
    PERSISTENT = "PERSISTENT"
