from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\reverseetl\models\ReverseEtlSyncStatusResponse.java

from dataclasses import dataclass
from typing import Any

from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status import ReverseEtlSyncStatus


@dataclass(slots=True, kw_only=True)
class ReverseEtlSyncStatusResponse:
    data: Data | None = None

    @dataclass(slots=True)
    class Data:
        reverse_e_t_l_sync_status: ReverseEtlSyncStatus | None = None
