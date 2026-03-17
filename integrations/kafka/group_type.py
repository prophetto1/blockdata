from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\GroupType.java

from enum import Enum
from typing import Any


class GroupType(str, Enum):
    CONSUMER = "CONSUMER"
    SHARE = "SHARE"
