from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class OAuth2(Task, RunnableTask):
    """Authenticate with YouTube using OAuth2."""
    client_id: Property[str]
    client_secret: Property[str]
    refresh_token: Property[str]
    token_url: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        access_token: str | None = None
        token_type: str | None = None
        expires_in: int | None = None
        scope: str | None = None
        expires_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    access_token: str | None = None
    token_type: str | None = None
    expires_in: int | None = None
    scope: str | None = None
    expires_at: datetime | None = None
