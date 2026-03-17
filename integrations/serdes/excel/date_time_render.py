from __future__ import annotations

from enum import Enum
from typing import Any


class DateTimeRender(str, Enum):
    SERIAL_NUMBER = "SERIAL_NUMBER"
    FORMATTED_STRING = "FORMATTED_STRING"
    UNFORMATTED_VALUE = "UNFORMATTED_VALUE"
