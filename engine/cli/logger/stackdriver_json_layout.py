from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\logger\StackdriverJsonLayout.java
# WARNING: Unresolved types: ILoggingEvent, JsonLayout

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class StackdriverJsonLayout(JsonLayout):
    severity_attribute: ClassVar[str] = "severity"
    timestamp_seconds_attribute: ClassVar[str] = "timestampSeconds"
    timestamp_nanos_attribute: ClassVar[str] = "timestampNanos"
    include_exception_in_message: bool | None = None
    custom_json: dict[str, Any] | None = None

    def to_json_map(self, event: ILoggingEvent) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
