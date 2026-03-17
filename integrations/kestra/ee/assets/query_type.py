from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\assets\QueryType.java
# WARNING: Unresolved types: QueryFilterOp

from enum import Enum
from typing import Any


class QueryType(str, Enum):
    EQUAL_TO = "EQUAL_TO"
    NOT_EQUAL_TO = "NOT_EQUAL_TO"
