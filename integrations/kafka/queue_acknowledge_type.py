from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\QueueAcknowledgeType.java
# WARNING: Unresolved types: AcknowledgeType, apache, clients, consumer, kafka, org

from enum import Enum
from typing import Any


class QueueAcknowledgeType(str, Enum):
    ACCEPT = "ACCEPT"
    RELEASE = "RELEASE"
    REJECT = "REJECT"
    RENEW = "RENEW"
