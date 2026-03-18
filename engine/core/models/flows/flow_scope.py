from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\FlowScope.java

from enum import Enum
from typing import Any


class FlowScope(str, Enum):
    USER = "USER"
    SYSTEM = "SYSTEM"
