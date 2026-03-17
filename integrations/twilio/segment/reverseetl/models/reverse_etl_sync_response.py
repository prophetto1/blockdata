from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class ReverseEtlSyncResponse:
    data: Data | None = None

    @dataclass(slots=True)
    class Data:
        reverse_e_t_l_manual_sync: ReverseETLManualSync | None = None

    @dataclass(slots=True)
    class ReverseETLManualSync:
        sync_id: str | None = None
        started_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Data:
    reverse_e_t_l_manual_sync: ReverseETLManualSync | None = None


@dataclass(slots=True, kw_only=True)
class ReverseETLManualSync:
    sync_id: str | None = None
    started_at: datetime | None = None
