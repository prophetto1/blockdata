from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\excel\DateTimeRender.java

from enum import Enum
from typing import Any


class DateTimeRender(str, Enum):
    SERIAL_NUMBER = "SERIAL_NUMBER"
    FORMATTED_STRING = "FORMATTED_STRING"
    UNFORMATTED_VALUE = "UNFORMATTED_VALUE"
