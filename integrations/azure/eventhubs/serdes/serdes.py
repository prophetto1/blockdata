from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\serdes\Serdes.java
# WARNING: Unresolved types: Supplier

from enum import Enum
from typing import Any

from integrations.azure.eventhubs.serdes.serde import Serde


class Serdes(str, Enum):
    STRING = "STRING"
    BINARY = "BINARY"
    ION = "ION"
    JSON = "JSON"
