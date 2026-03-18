from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\GraphClusterFinally.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph


@dataclass(slots=True, kw_only=True)
class GraphClusterFinally(AbstractGraph):
    pass
