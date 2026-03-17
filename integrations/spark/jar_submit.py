from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.spark.abstract_submit import AbstractSubmit
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class JarSubmit(AbstractSubmit):
    """Submit Spark job with JAR"""
    main_resource: Property[str]
    main_class: Property[str]
    jars: Property[dict[String, String]] | None = None

    def configure(self, run_context: RunContext, spark: SparkLauncher) -> None:
        raise NotImplementedError  # TODO: translate from Java
