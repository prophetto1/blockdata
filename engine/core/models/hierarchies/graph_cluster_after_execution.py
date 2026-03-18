from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\GraphClusterAfterExecution.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph


@dataclass(slots=True, kw_only=True)
class GraphClusterAfterExecution(AbstractGraph):
    pass
