from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\Feature.java

from enum import Enum
from typing import Any


class Feature(str, Enum):
    CATALOG = "CATALOG"
    PROPERTIES = "PROPERTIES"
    DISCOVER = "DISCOVER"
    STATE = "STATE"
