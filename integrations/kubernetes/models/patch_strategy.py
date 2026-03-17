from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\models\PatchStrategy.java

from enum import Enum
from typing import Any


class PatchStrategy(str, Enum):
    STRATEGIC_MERGE = "STRATEGIC_MERGE"
    JSON_MERGE = "JSON_MERGE"
    JSON_PATCH = "JSON_PATCH"
