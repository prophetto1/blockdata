from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\StatefulTriggerService.java
# WARNING: Unresolved types: On

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface


@dataclass(slots=True, kw_only=True)
class StatefulTriggerService:

    @staticmethod
    def read_state(run_context: RunContext, key: str, ttl: Optional[timedelta]) -> dict[str, Entry]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_state(run_context: RunContext, key: str, state: dict[str, Entry], ttl: Optional[timedelta]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def compute_and_update_state(state: dict[str, Entry], candidate: Entry, on: StatefulTriggerInterface.On) -> StateUpdate:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def should_fire(prev: Entry, version: str, on: StatefulTriggerInterface.On) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def default_key(ns: str, flow_id: str, trigger_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Entry:
        uri: str | None = None
        version: str | None = None
        modified_at: datetime | None = None
        last_seen_at: datetime | None = None

        @staticmethod
        def candidate(uri: str, version: str, modified_at: datetime) -> Entry:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StateUpdate:
        fire: bool | None = None
        is_new: bool | None = None
