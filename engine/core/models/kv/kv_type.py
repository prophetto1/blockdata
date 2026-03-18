from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\kv\KVType.java

from enum import Enum
from typing import Any


class KVType(str, Enum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    BOOLEAN = "BOOLEAN"
    DATETIME = "DATETIME"
    DATE = "DATE"
    DURATION = "DURATION"
    JSON = "JSON"
