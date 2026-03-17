from __future__ import annotations

from enum import Enum
from typing import Any


class Feature(str, Enum):
    CATALOG = "CATALOG"
    PROPERTIES = "PROPERTIES"
    DISCOVER = "DISCOVER"
    STATE = "STATE"
