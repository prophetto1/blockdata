from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\messenger\MessagingType.java

from enum import Enum
from typing import Any


class MessagingType(str, Enum):
    RESPONSE = "RESPONSE"
    UPDATE = "UPDATE"
    MESSAGE_TAG = "MESSAGE_TAG"
