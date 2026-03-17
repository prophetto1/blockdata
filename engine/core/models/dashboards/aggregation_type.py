from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\AggregationType.java

from enum import Enum
from typing import Any


class AggregationType(str, Enum):
    AVG = "AVG"
    MAX = "MAX"
    MIN = "MIN"
    SUM = "SUM"
    COUNT = "COUNT"
