from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\reverseetl\models\ReverseEtlSyncStatus.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReverseEtlSyncStatus:
    sync_id: str | None = None
    status: str | None = None
    source_id: str | None = None
    model_id: str | None = None
    duration: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    extract_phase: ExtractPhase | None = None
    load_phase: LoadPhase | None = None
    error: str | None = None
    error_code: str | None = None

    def is_terminal(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_successful(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExtractPhase:
        added_count: str | None = None
        updated_count: str | None = None
        deleted_count: str | None = None
        extract_count: str | None = None

    @dataclass(slots=True)
    class LoadPhase:
        deliver_success_count: str | None = None
        deliver_failure_count: str | None = None
