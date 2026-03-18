from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\models\SerdeType.java
# WARNING: Unresolved types: IOException

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    """Serializer / Deserializer used for the message."""
    STRING = "STRING"
    JSON = "JSON"
