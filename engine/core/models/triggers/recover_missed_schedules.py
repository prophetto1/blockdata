from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\RecoverMissedSchedules.java

from enum import Enum
from typing import Any


class RecoverMissedSchedules(str, Enum):
    LAST = "LAST"
    NONE = "NONE"
    ALL = "ALL"
