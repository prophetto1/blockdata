from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\servicebus\SerdeType.java
# WARNING: Unresolved types: BinaryData, IOException, ObjectMapper

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    STRING = "STRING"
    JSON = "JSON"
