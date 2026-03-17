from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\exec\scripts\models\RunnerType.java

from enum import Enum
from typing import Any


class RunnerType(str, Enum):
    PROCESS = "PROCESS"
    DOCKER = "DOCKER"
