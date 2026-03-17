from __future__ import annotations

from enum import Enum
from typing import Any


class VideoType(str, Enum):
    VIDEO = "VIDEO"
    REELS = "REELS"
    STORIES = "STORIES"
