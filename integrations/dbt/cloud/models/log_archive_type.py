from __future__ import annotations

from enum import Enum
from typing import Any


class LogArchiveType(str, Enum):
    DB_FLUSHED = "DB_FLUSHED"
    SCRIBE = "SCRIBE"
