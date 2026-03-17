from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionKind.java

from enum import Enum
from typing import Any


class ExecutionKind(str, Enum):
    NORMAL = "NORMAL"
    TEST = "TEST"
    PLAYGROUND = "PLAYGROUND"
