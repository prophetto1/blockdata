from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class OAuthTokenProvider(io):
    task: Task | None = None
    output: str | None = None
    run_context: RunContext | None = None

    def get_token(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
