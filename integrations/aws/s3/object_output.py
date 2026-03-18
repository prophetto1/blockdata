from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\ObjectOutput.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ObjectOutput(ABC):
    e_tag: str | None = None
    version_id: str | None = None
