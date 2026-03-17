from __future__ import annotations

from enum import Enum
from typing import Any


class QueueAcknowledgeType(str, Enum):
    ACCEPT = "ACCEPT"
    RELEASE = "RELEASE"
    REJECT = "REJECT"
    RENEW = "RENEW"
