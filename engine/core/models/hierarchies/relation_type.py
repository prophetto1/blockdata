from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\RelationType.java

from enum import Enum
from typing import Any


class RelationType(str, Enum):
    SEQUENTIAL = "SEQUENTIAL"
    CHOICE = "CHOICE"
    ERROR = "ERROR"
    FINALLY = "FINALLY"
    AFTER_EXECUTION = "AFTER_EXECUTION"
    PARALLEL = "PARALLEL"
    DYNAMIC = "DYNAMIC"
