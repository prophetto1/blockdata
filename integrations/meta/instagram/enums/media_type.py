from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\instagram\enums\MediaType.java

from enum import Enum
from typing import Any


class MediaType(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    CAROUSEL = "CAROUSEL"
    REELS = "REELS"
    STORIES = "STORIES"
