from __future__ import annotations

from enum import Enum
from typing import Any


class PublishedStatus(str, Enum):
    PUBLISHED = "PUBLISHED"
    UNPUBLISHED = "UNPUBLISHED"
    ANY = "ANY"
