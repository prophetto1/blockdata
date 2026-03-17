from __future__ import annotations

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    DOUBLE = "DOUBLE"
    LONG = "LONG"
    SHORT = "SHORT"
    BYTE_ARRAY = "BYTE_ARRAY"
    BYTE_BUFFER = "BYTE_BUFFER"
    BYTES = "BYTES"
    UUID = "UUID"
    VOID = "VOID"
    AVRO = "AVRO"
    JSON = "JSON"
