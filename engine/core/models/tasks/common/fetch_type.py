from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\common\FetchType.java

from enum import Enum
from typing import Any


class FetchType(str, Enum):
    STORE = "STORE"
    FETCH = "FETCH"
    FETCH_ONE = "FETCH_ONE"
    NONE = "NONE"
