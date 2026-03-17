from __future__ import annotations

from enum import Enum
from typing import Any


class BeamRunner(str, Enum):
    DIRECT = "DIRECT"
    FLINK = "FLINK"
    SPARK = "SPARK"
    DATAFLOW = "DATAFLOW"
