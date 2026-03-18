from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\excel\ValueRender.java

from enum import Enum
from typing import Any


class ValueRender(str, Enum):
    FORMATTED_VALUE = "FORMATTED_VALUE"
    UNFORMATTED_VALUE = "UNFORMATTED_VALUE"
    FORMULA = "FORMULA"
