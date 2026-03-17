from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class AttemptStats:
    records_emitted: int | None = None
    bytes_emitted: int | None = None
    state_messages_emitted: int | None = None
    records_committed: int | None = None
