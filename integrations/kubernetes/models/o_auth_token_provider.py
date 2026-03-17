from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\models\OAuthTokenProvider.java
# WARNING: Unresolved types: client, fabric8, io, kubernetes

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class OAuthTokenProvider:
    task: Task | None = None
    output: str | None = None
    run_context: RunContext | None = None

    def get_token(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
