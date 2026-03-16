from __future__ import annotations

from enum import Enum


class State(str, Enum):
    CREATED = "CREATED"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    WARNING = "WARNING"
    KILLED = "KILLED"
    SKIPPED = "SKIPPED"

    def is_failed(self) -> bool:
        return self in {State.FAILED, State.KILLED}

    def is_terminated(self) -> bool:
        return self in {
            State.SUCCESS,
            State.FAILED,
            State.WARNING,
            State.KILLED,
            State.SKIPPED,
        }
