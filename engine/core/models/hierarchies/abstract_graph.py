from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\AbstractGraph.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractGraph(ABC):
    uid: str | None = None
    type: str | None = None
    branch_type: BranchType | None = None

    def get_label(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def update_uid_with_children(self, uid: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def update_with_children(self, branch_type: BranchType) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def for_execution(self) -> AbstractGraph:
        raise NotImplementedError  # TODO: translate from Java

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class BranchType(str, Enum):
        ERROR = "ERROR"
        FINALLY = "FINALLY"
        AFTER_EXECUTION = "AFTER_EXECUTION"
