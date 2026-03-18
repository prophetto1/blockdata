from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\Entity.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class Entity:
    type: Property[Type]
    value: Property[str]

    class Type(str, Enum):
        DOMAIN = "DOMAIN"
        GROUP = "GROUP"
        USER = "USER"
