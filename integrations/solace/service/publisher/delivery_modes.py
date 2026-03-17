from __future__ import annotations

from enum import Enum
from typing import Any


class DeliveryModes(str, Enum):
    DIRECT = "DIRECT"
    PERSISTENT = "PERSISTENT"
