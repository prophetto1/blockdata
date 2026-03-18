from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linear\src\main\java\io\kestra\plugin\linear\model\Queries.java

from enum import Enum
from typing import Any


class Queries(str, Enum):
    TEAMS = "TEAMS"
    LABELS = "LABELS"
