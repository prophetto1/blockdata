from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\TraceLevel.java

from enum import Enum
from typing import Any


class TraceLevel(str, Enum):
    DISABLED = "DISABLED"
    DEFAULT = "DEFAULT"
    FINE = "FINE"
