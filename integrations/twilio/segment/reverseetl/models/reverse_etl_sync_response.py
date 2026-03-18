from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\reverseetl\models\ReverseEtlSyncResponse.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


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
