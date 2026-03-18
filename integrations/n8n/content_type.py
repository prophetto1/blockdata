from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-n8n\src\main\java\io\kestra\plugin\n8n\ContentType.java

from enum import Enum
from typing import Any


class ContentType(str, Enum):
    TEXT = "TEXT"
    JSON = "JSON"
    XML = "XML"
    BINARY = "BINARY"
