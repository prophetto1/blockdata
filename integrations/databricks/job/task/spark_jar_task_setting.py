from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkJarTaskSetting:
    jar_uri: Property[str] | None = None
    main_class_name: Property[str] | None = None
    parameters: Any | None = None

    def to_spark_jar_task(self, run_context: RunContext) -> SparkJarTask:
        raise NotImplementedError  # TODO: translate from Java
