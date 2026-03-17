from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\JobConfigType.java

from enum import Enum
from typing import Any


class JobConfigType(str, Enum):
    CHECK_CONNECTION_SOURCE = "CHECK_CONNECTION_SOURCE"
    CHECK_CONNECTION_DESTINATION = "CHECK_CONNECTION_DESTINATION"
    DISCOVER_SCHEMA = "DISCOVER_SCHEMA"
    GET_SPEC = "GET_SPEC"
    SYNC = "SYNC"
    RESET_CONNECTION = "RESET_CONNECTION"
