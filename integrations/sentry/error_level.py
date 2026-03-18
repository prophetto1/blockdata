from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-sentry\src\main\java\io\kestra\plugin\sentry\ErrorLevel.java

from enum import Enum
from typing import Any


class ErrorLevel(str, Enum):
    FATAL = "FATAL"
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"
    DEBUG = "DEBUG"
