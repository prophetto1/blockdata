from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\companies\CompanyRequest.java

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class CompanyRequest:
    properties: dict[str, Any] = field(default_factory=dict)
