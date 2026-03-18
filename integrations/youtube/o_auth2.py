from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-youtube\src\main\java\io\kestra\plugin\youtube\OAuth2.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class OAuth2(Task):
    """Authenticate with YouTube using OAuth2."""
    client_id: Property[str]
    client_secret: Property[str]
    refresh_token: Property[str]
    token_url: Property[str] = Property.ofValue("https://oauth2.googleapis.com/token")

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        access_token: str | None = None
        token_type: str | None = None
        expires_in: int | None = None
        scope: str | None = None
        expires_at: datetime | None = None
