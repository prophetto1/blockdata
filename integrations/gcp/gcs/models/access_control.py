from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.gcs.models.entity import Entity
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class Role(str, Enum):
    READER = "READER"
    WRITER = "WRITER"
    OWNER = "OWNER"


@dataclass(slots=True, kw_only=True)
class AccessControl:
    entity: Entity
    role: Property[Role]

    def convert(self, access_controls: list[AccessControl], run_context: RunContext) -> list[Acl]:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, run_context: RunContext) -> Acl:
        raise NotImplementedError  # TODO: translate from Java
