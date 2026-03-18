from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\PullPolicy.java

from enum import Enum
from typing import Any


class PullPolicy(str, Enum):
    """The image pull policy for a container image and the tag of the image, which affect when Docker attempts to pull (download) the specified image."""
    IF_NOT_PRESENT = "IF_NOT_PRESENT"
    ALWAYS = "ALWAYS"
    NEVER = "NEVER"
