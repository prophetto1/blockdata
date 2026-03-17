from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\services\TimestampService.java
# WARNING: Unresolved types: Timestamp

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class TimestampService(ABC):

    @staticmethod
    def of(timestamp: Timestamp) -> datetime:
        raise NotImplementedError  # TODO: translate from Java
