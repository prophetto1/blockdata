from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\GraphTask.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph_task import AbstractGraphTask
from engine.core.models.hierarchies.relation_type import RelationType
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class GraphTask(AbstractGraphTask):
    pass
