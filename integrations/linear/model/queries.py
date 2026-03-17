from __future__ import annotations

from enum import Enum
from typing import Any


class Queries(str, Enum):
    TEAMS = "TEAMS"
    LABELS = "LABELS"
