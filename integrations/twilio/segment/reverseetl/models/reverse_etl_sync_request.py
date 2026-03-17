from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReverseEtlSyncRequest:
    source_id: str | None = None
    model_id: str | None = None
    subscription_id: str | None = None
