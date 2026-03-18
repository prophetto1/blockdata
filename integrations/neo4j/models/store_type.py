from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-neo4j\src\main\java\io\kestra\plugin\neo4j\models\StoreType.java

from enum import Enum
from typing import Any


class StoreType(str, Enum):
    STORE = "STORE"
    FETCH = "FETCH"
    FETCHONE = "FETCHONE"
    NONE = "NONE"
