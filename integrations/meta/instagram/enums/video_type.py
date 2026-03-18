from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\instagram\enums\VideoType.java

from enum import Enum
from typing import Any


class VideoType(str, Enum):
    VIDEO = "VIDEO"
    REELS = "REELS"
    STORIES = "STORIES"
