from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status import ReverseEtlSyncStatus


@dataclass(slots=True, kw_only=True)
class ReverseEtlSyncStatusResponse:
    data: Data | None = None

    @dataclass(slots=True)
    class Data:
        reverse_e_t_l_sync_status: ReverseEtlSyncStatus | None = None


@dataclass(slots=True, kw_only=True)
class Data:
    reverse_e_t_l_sync_status: ReverseEtlSyncStatus | None = None
