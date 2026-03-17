from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\FetchVersion.java

from enum import Enum
from typing import Any


class FetchVersion(str, Enum):
    LATEST = "LATEST"
    OLD = "OLD"
    ALL = "ALL"
