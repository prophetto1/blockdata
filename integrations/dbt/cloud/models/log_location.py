from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\LogLocation.java

from enum import Enum
from typing import Any


class LogLocation(str, Enum):
    LEGACY = "LEGACY"
    DB = "DB"
    S3 = "S3"
    EMPTY = "EMPTY"
