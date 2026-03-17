from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PythonWheelTaskSetting:
    entry_point: Property[str] | None = None
    parameters: Any | None = None
    named_parameters: Any | None = None
    package_name: Property[str] | None = None

    def to_python_wheel_task(self, run_context: RunContext) -> PythonWheelTask:
        raise NotImplementedError  # TODO: translate from Java
