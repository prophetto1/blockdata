from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\charts\TooltipBehaviour.java

from enum import Enum
from typing import Any


class TooltipBehaviour(str, Enum):
    NONE = "NONE"
    ALL = "ALL"
    SINGLE = "SINGLE"
