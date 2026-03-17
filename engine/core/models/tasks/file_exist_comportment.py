from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\FileExistComportment.java

from enum import Enum
from typing import Any


class FileExistComportment(str, Enum):
    OVERWRITE = "OVERWRITE"
    FAIL = "FAIL"
    WARN = "WARN"
    IGNORE = "IGNORE"
