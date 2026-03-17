from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\model\SerdeType.java
# WARNING: Unresolved types: IOException, ObjectMapper

from enum import Enum
from typing import Any


class SerdeType(str, Enum):
    STRING = "STRING"
    JSON = "JSON"
