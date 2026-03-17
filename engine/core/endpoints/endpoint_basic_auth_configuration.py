from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\endpoints\EndpointBasicAuthConfiguration.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class EndpointBasicAuthConfiguration:
    username: str | None = None
    password: str | None = None
