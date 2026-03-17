from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class ReplicationMethod(str, Enum):
    append = "append"
    truncate = "truncate"


@dataclass(slots=True, kw_only=True)
class AdswerveBigQuery(AbstractPythonTarget, RunnableTask):
    """Load data into a BigQuery with a Singer target."""
    project_id: str
    dataset_id: str
    location: Property[str] | None = None
    validate_records: Property[bool]
    add_metadata_columns: Property[bool] | None = None
    replication_method: Property[ReplicationMethod] | None = None
    table_prefix: Property[str] | None = None
    table_suffix: Property[str] | None = None
    max_cache: Property[int] | None = None
    service_account: Property[str] | None = None
    merge_state_messages: Property[bool] | None = None
    table_configs: Property[dict[String, Object]] | None = None

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def environment_variables(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
