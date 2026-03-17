from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\sentry\EndpointType.java

from enum import Enum
from typing import Any


class EndpointType(str, Enum):
    ENVELOPE = "ENVELOPE"
    STORE = "STORE"
