from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSns(AbstractConnection):
    """Shared SNS connection"""
    topic_arn: Property[str]

    def client(self, run_context: RunContext) -> SnsClient:
        raise NotImplementedError  # TODO: translate from Java
