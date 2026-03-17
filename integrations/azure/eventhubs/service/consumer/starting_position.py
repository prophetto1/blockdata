from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\consumer\StartingPosition.java

from enum import Enum
from typing import Any


class StartingPosition(str, Enum):
    EARLIEST = "EARLIEST"
    LATEST = "LATEST"
    INSTANT = "INSTANT"
