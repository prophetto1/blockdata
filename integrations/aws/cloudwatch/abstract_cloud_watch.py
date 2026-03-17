from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCloudWatch(AbstractConnection):
    """Shared CloudWatch connection"""

    def client(self, run_context: RunContext) -> CloudWatchClient:
        raise NotImplementedError  # TODO: translate from Java
