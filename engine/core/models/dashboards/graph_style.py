from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\GraphStyle.java

from enum import Enum
from typing import Any


class GraphStyle(str, Enum):
    LINES = "LINES"
    BARS = "BARS"
    POINTS = "POINTS"
