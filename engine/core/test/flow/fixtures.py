from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\Fixtures.java

from dataclasses import dataclass
from typing import Any

from engine.core.test.flow.task_fixture import TaskFixture
from engine.core.test.flow.trigger_fixture import TriggerFixture


@dataclass(slots=True, kw_only=True)
class Fixtures:
    inputs: dict[str, Any] | None = None
    files: dict[str, str] | None = None
    tasks: list[TaskFixture] | None = None
    trigger: TriggerFixture | None = None
