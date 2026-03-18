from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\ApifySortDirection.java

from enum import Enum
from typing import Any


class ApifySortDirection(str, Enum):
    ASC = "ASC"
    DESC = "DESC"
