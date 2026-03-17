from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\TargetOS.java

from enum import Enum
from typing import Any


class TargetOS(str, Enum):
    LINUX = "LINUX"
    WINDOWS = "WINDOWS"
    AUTO = "AUTO"
