from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\model\XContentType.java

from enum import Enum
from typing import Any


class XContentType(str, Enum):
    CBOR = "CBOR"
    JSON = "JSON"
    SMILE = "SMILE"
    YAML = "YAML"
