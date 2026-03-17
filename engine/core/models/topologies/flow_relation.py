from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\topologies\FlowRelation.java

from enum import Enum
from typing import Any


class FlowRelation(str, Enum):
    FLOW_TASK = "FLOW_TASK"
    FLOW_TRIGGER = "FLOW_TRIGGER"
