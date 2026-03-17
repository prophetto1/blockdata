from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\SchemaType.java

from enum import Enum
from typing import Any


class SchemaType(str, Enum):
    NONE = "NONE"
    AVRO = "AVRO"
    JSON = "JSON"
