from __future__ import annotations

from enum import Enum
from typing import Any


class QueryType(str, Enum):
    EQUAL_TO = "EQUAL_TO"
    NOT_EQUAL_TO = "NOT_EQUAL_TO"
