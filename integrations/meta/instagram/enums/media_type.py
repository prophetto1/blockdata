from __future__ import annotations

from enum import Enum
from typing import Any


class MediaType(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    CAROUSEL = "CAROUSEL"
    REELS = "REELS"
    STORIES = "STORIES"
