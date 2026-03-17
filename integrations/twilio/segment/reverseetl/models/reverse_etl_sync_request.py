from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\reverseetl\models\ReverseEtlSyncRequest.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReverseEtlSyncRequest:
    source_id: str | None = None
    model_id: str | None = None
    subscription_id: str | None = None
