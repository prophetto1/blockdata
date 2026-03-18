from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\model\OpType.java
# WARNING: Unresolved types: _types, clients, co, elastic, elasticsearch

from enum import Enum
from typing import Any


class OpType(str, Enum):
    INDEX = "INDEX"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
