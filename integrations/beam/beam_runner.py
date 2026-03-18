from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\BeamRunner.java

from enum import Enum
from typing import Any


class BeamRunner(str, Enum):
    """Supported Beam runners"""
    DIRECT = "DIRECT"
    FLINK = "FLINK"
    SPARK = "SPARK"
    DATAFLOW = "DATAFLOW"
