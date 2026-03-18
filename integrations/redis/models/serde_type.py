from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\models\SerdeType.java
# WARNING: Unresolved types: IOException

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    """Serializer / Deserializer use for the value"""
    STRING = "STRING"
    JSON = "JSON"
