from __future__ import annotations

from enum import Enum
from typing import Any

from engine.core.models.flows.state import State


class JobStatus(str, Enum):
    NUMBER_1 = "NUMBER_1"
    NUMBER_2 = "NUMBER_2"
    NUMBER_3 = "NUMBER_3"
    NUMBER_10 = "NUMBER_10"
    NUMBER_20 = "NUMBER_20"
    NUMBER_30 = "NUMBER_30"
