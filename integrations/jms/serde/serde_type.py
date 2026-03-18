from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\serde\SerdeType.java
# WARNING: Unresolved types: IOException

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    """Serializer / Deserializer used for the message body."""
    STRING = "STRING"
    JSON = "JSON"
    BYTES = "BYTES"
