from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\DatamillCoPostgres.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DatamillCoPostgres(AbstractPythonTarget):
    """Load data into a PostgreSQL database with a Singer target. """
    host: str
    username: str
    port: Property[int]
    schema: Property[str] = Property.ofValue("public")
    ssl_mode: Property[str] = Property.ofValue("prefer")
    invalid_records_detect: Property[bool] = Property.ofValue(true)
    invalid_records_threshold: Property[int] = Property.ofValue(0)
    logging_level: Property[str] = Property.ofValue("INFO")
    persist_empty_tables: Property[bool] = Property.ofValue(false)
    max_batch_rows: Property[int] = Property.ofValue(200000)
    max_buffer_size: Property[int] = Property.ofValue(104857600)
    add_upsert_indexes: Property[bool] = Property.ofValue(true)
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    batch_detection_threshold: Property[int] | None = None
    before_run_sql: Property[str] | None = None
    after_run_sql: Property[str] | None = None

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
