from __future__ import annotations

from enum import Enum
from typing import Any


class PatchStrategy(str, Enum):
    STRATEGIC_MERGE = "STRATEGIC_MERGE"
    JSON_MERGE = "JSON_MERGE"
    JSON_PATCH = "JSON_PATCH"
