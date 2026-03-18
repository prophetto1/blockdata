from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\SerdeType.java
# WARNING: Unresolved types: IOException

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    STRING = "STRING"
    JSON = "JSON"
    BYTES = "BYTES"
