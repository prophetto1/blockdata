from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.gcs.models.entity import Entity
from engine.core.models.property.property import Property


class Role(str, Enum):
    READER = "READER"
    WRITER = "WRITER"
    OWNER = "OWNER"


@dataclass(slots=True, kw_only=True)
class AccessControl:
    entity: Entity
    role: Property[Role]
