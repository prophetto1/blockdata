from __future__ import annotations

from enum import Enum
from typing import Any


class LogLocation(str, Enum):
    LEGACY = "LEGACY"
    DB = "DB"
    S3 = "S3"
    EMPTY = "EMPTY"
