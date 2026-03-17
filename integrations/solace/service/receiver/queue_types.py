from __future__ import annotations

from enum import Enum
from typing import Any


class QueueTypes(str, Enum):
    DURABLE_EXCLUSIVE = "DURABLE_EXCLUSIVE"
    DURABLE_NON_EXCLUSIVE = "DURABLE_NON_EXCLUSIVE"
    NON_DURABLE_EXCLUSIVE = "NON_DURABLE_EXCLUSIVE"
