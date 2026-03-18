from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\connections\SyncAlreadyRunningException.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class SyncAlreadyRunningException(Exception):
    pass
