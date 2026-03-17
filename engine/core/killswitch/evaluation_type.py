from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\killswitch\EvaluationType.java

from enum import Enum
from typing import Any

from engine.core.models.executions.execution import Execution


class EvaluationType(str, Enum):
    PASS = "PASS"
    KILL = "KILL"
    CANCEL = "CANCEL"
    IGNORE = "IGNORE"
