from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airbyte.models.stream_descriptor import StreamDescriptor


@dataclass(slots=True, kw_only=True)
class ResetConfig:
    streams_to_reset: list[StreamDescriptor] | None = None
