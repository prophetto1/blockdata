from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\model\OpType.java
# WARNING: Unresolved types: _types, client, opensearch, org

from enum import Enum
from typing import Any


class OpType(str, Enum):
    INDEX = "INDEX"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
