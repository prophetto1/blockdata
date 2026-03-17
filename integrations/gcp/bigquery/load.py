from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\Load.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_load import AbstractLoad
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    """Load an internal file into BigQuery"""
    failed_on_empty: Property[bool] = Property.ofValue(true)
    from: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
