from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property


class Type(str, Enum):
    DOMAIN = "DOMAIN"
    GROUP = "GROUP"
    USER = "USER"


@dataclass(slots=True, kw_only=True)
class Entity:
    type: Property[Type]
    value: Property[str]
