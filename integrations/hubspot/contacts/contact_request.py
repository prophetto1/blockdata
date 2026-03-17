from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\contacts\ContactRequest.java

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ContactRequest:
    properties: dict[str, Any] = field(default_factory=dict)
