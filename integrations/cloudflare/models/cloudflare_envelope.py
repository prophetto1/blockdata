from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\models\CloudflareEnvelope.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class CloudflareEnvelope:
    success: bool | None = None
    errors: list[ApiMessage] | None = None
    messages: list[ApiMessage] | None = None
    result: T | None = None

    @dataclass(slots=True)
    class ApiMessage:
        code: int | None = None
        message: str | None = None
        documentation_url: str | None = None
