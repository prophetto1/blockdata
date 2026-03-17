from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\model\XContentType.java

from enum import Enum
from typing import Any


class XContentType(str, Enum):
    CBOR = "CBOR"
    JSON = "JSON"
    SMILE = "SMILE"
    YAML = "YAML"
