from __future__ import annotations

from enum import Enum
from typing import Any


class SchemaType(str, Enum):
    NONE = "NONE"
    AVRO = "AVRO"
    JSON = "JSON"
