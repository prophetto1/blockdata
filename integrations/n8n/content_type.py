from __future__ import annotations

from enum import Enum
from typing import Any


class ContentType(str, Enum):
    TEXT = "TEXT"
    JSON = "JSON"
    XML = "XML"
    BINARY = "BINARY"
