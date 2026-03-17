from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\AbstractGraphTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.hierarchies.relation_type import RelationType
from engine.core.models.tasks.task_interface import TaskInterface
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class AbstractGraphTask(ABC, AbstractGraph):
    task: TaskInterface | None = None
    task_run: TaskRun | None = None
    values: list[str] | None = None
    relation_type: RelationType | None = None

    def get_label(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def for_execution(self) -> AbstractGraph:
        raise NotImplementedError  # TODO: translate from Java
