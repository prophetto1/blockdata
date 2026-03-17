from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\ServerType.java

from enum import Enum
from typing import Any


class ServerType(str, Enum):
    EXECUTOR = "EXECUTOR"
    INDEXER = "INDEXER"
    SCHEDULER = "SCHEDULER"
    STANDALONE = "STANDALONE"
    WEBSERVER = "WEBSERVER"
    WORKER = "WORKER"
