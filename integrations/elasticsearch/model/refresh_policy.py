from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\model\RefreshPolicy.java

from enum import Enum
from typing import Any

from integrations.powerbi.models.refresh import Refresh


class RefreshPolicy(str, Enum):
    IMMEDIATE = "IMMEDIATE"
    WAIT_UNTIL = "WAIT_UNTIL"
    NONE = "NONE"
