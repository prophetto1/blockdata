from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\model\RefreshPolicy.java

from enum import Enum
from typing import Any

from integrations.powerbi.models.refresh import Refresh


class RefreshPolicy(str, Enum):
    IMMEDIATE = "IMMEDIATE"
    WAIT_UNTIL = "WAIT_UNTIL"
    NONE = "NONE"
