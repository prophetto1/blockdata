from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-odoo\src\main\java\io\kestra\plugin\odoo\Operation.java

from enum import Enum
from typing import Any


class Operation(str, Enum):
    SEARCH_READ = "SEARCH_READ"
    READ = "READ"
    CREATE = "CREATE"
    WRITE = "WRITE"
    UNLINK = "UNLINK"
    SEARCH = "SEARCH"
    SEARCH_COUNT = "SEARCH_COUNT"
