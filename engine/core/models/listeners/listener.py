from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\listeners\Listener.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Listener:
    description: str | None = None
    conditions: list[Condition] | None = None
    tasks: list[Task] | None = None
