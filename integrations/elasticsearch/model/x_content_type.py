from __future__ import annotations

from enum import Enum
from typing import Any


class XContentType(str, Enum):
    CBOR = "CBOR"
    JSON = "JSON"
    SMILE = "SMILE"
    YAML = "YAML"
