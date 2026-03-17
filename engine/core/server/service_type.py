from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceType.java

from enum import Enum
from typing import Any


class ServiceType(str, Enum):
    EXECUTOR = "EXECUTOR"
    INDEXER = "INDEXER"
    SCHEDULER = "SCHEDULER"
    WEBSERVER = "WEBSERVER"
    WORKER = "WORKER"
    INVALID = "INVALID"
