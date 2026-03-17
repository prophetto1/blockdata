from __future__ import annotations

from enum import Enum
from typing import Any


class StoreType(str, Enum):
    STORE = "STORE"
    FETCH = "FETCH"
    FETCHONE = "FETCHONE"
    NONE = "NONE"
