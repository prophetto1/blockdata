from __future__ import annotations

from enum import Enum
from typing import Any


class MessagingType(str, Enum):
    RESPONSE = "RESPONSE"
    UPDATE = "UPDATE"
    MESSAGE_TAG = "MESSAGE_TAG"
