from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCloudFormation(AbstractConnection):
    stack_name: Property[str]
    wait_for_completion: Property[bool] | None = None

    def cf_client(self, run_context: RunContext) -> CloudFormationClient:
        raise NotImplementedError  # TODO: translate from Java
