from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\MessageProtectionConfiguration.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MessageProtectionConfiguration:
    enabled: bool = False
    limit: int = 10 * 1024 * 1024
