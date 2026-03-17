from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\LogArchiveType.java

from enum import Enum
from typing import Any


class LogArchiveType(str, Enum):
    DB_FLUSHED = "DB_FLUSHED"
    SCRIBE = "SCRIBE"
