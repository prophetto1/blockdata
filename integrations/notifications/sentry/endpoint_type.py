from __future__ import annotations

from enum import Enum
from typing import Any


class EndpointType(str, Enum):
    ENVELOPE = "ENVELOPE"
    STORE = "STORE"
