from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\AccessControl.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.azure.storage.table.models.entity import Entity
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AccessControl:
    entity: Entity
    role: Property[Role]

    class Role(str, Enum):
        READER = "READER"
        WRITER = "WRITER"
        OWNER = "OWNER"
