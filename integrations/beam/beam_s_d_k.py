from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\BeamSDK.java

from enum import Enum
from typing import Any


class BeamSDK(str, Enum):
    """Beam SDK used to execute the pipeline"""
    JAVA = "JAVA"
    PYTHON = "PYTHON"
