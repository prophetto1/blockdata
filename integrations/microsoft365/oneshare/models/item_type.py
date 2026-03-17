from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\models\ItemType.java

from enum import Enum
from typing import Any


class ItemType(str, Enum):
    FILE = "FILE"
    FOLDER = "FOLDER"
