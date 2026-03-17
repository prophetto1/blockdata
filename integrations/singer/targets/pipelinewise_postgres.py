from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewisePostgres(AbstractPythonTarget, RunnableTask):
    """Load data into a PostgreSQL database with a Singer target."""
    host: str
    username: str
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    port: Property[int]
    batch_size_rows: Property[int] | None = None
    flush_all_streams: Property[bool] | None = None
    parallelism: Property[int] | None = None
    max_parallelism: Property[int] | None = None
    add_metadata_columns: Property[bool] | None = None
    hard_delete: Property[bool] | None = None
    data_flattening_max_level: Property[int] | None = None
    primary_key_required: Property[bool] | None = None
    validate_records: Property[bool] | None = None
    default_target_schema: Property[str] | None = None
    default_target_schema_select_permission: Property[str] | None = None

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
