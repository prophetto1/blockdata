from __future__ import annotations

from enum import Enum
from typing import Any

from integrations.solace.serde.serde import Serde


class Serdes(str, Enum):
    STRING = "STRING"
    BINARY = "BINARY"
    ION = "ION"
    JSON = "JSON"
