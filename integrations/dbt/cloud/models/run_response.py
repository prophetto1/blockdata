from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hightouch.models.run import Run
from integrations.twilio.segment.reverseetl.status import Status


@dataclass(slots=True, kw_only=True)
class RunResponse:
    data: Run | None = None
    status: Status | None = None
