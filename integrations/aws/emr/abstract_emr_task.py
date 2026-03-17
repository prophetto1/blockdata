from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractEmrTask(AbstractConnection):

    def client(self, run_context: RunContext) -> EmrClient:
        raise NotImplementedError  # TODO: translate from Java

    def emr_client(self, run_context: RunContext) -> EmrClient:
        raise NotImplementedError  # TODO: translate from Java
