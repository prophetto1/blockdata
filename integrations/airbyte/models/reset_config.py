from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\ResetConfig.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.stream_descriptor import StreamDescriptor


@dataclass(slots=True, kw_only=True)
class ResetConfig:
    streams_to_reset: list[StreamDescriptor] | None = None
