from __future__ import annotations

from enum import Enum
from typing import Any


class GroupType(str, Enum):
    CONSUMER = "CONSUMER"
    SHARE = "SHARE"
