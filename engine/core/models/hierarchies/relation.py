from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\Relation.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.relation_type import RelationType


@dataclass(slots=True, kw_only=True)
class Relation:
    relation_type: RelationType | None = None
    value: str | None = None
