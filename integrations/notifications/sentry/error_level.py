from __future__ import annotations

from enum import Enum
from typing import Any


class ErrorLevel(str, Enum):
    FATAL = "FATAL"
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"
    DEBUG = "DEBUG"
