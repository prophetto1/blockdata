from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\servicebus\Message.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class Message:
    message_id: str | None = None
    subject: str | None = None
    body: Any | None = None
    time_to_live: timedelta | None = None
    application_properties: dict[str, Any] | None = None
