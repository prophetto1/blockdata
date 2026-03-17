from __future__ import annotations

from enum import Enum
from typing import Any


class StartingPosition(str, Enum):
    EARLIEST = "EARLIEST"
    LATEST = "LATEST"
    INSTANT = "INSTANT"
