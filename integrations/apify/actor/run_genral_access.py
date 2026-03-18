from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\RunGenralAccess.java

from enum import Enum
from typing import Any


class RunGenralAccess(str, Enum):
    FOLLOW_USER_SETTING = "FOLLOW_USER_SETTING"
    RESTRICTED = "RESTRICTED"
    ANYONE_WITH_ID_CAN_READ = "ANYONE_WITH_ID_CAN_READ"
