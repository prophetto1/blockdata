from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\SubflowGraphCluster.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.models.hierarchies.subflow_graph_task import SubflowGraphTask


@dataclass(slots=True, kw_only=True)
class SubflowGraphCluster(GraphCluster):
    pass
