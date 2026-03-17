from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.spark.abstract_submit import AbstractSubmit
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PythonSubmit(AbstractSubmit):
    """Submit PySpark job to Spark"""
    main_script: Property[str]
    python_files: Property[dict[String, String]] | None = None

    def configure(self, run_context: RunContext, spark: SparkLauncher) -> None:
        raise NotImplementedError  # TODO: translate from Java
