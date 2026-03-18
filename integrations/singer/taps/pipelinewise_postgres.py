from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\PipelinewisePostgres.java

from dataclasses import dataclass
from typing import Any

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewisePostgres(AbstractPythonTap):
    """Fetch data from a PostgreSQL database with a Singer tap."""
    host: str
    username: str
    port: Property[int]
    ssl: Property[bool] = Property.ofValue(false)
    logical_poll_seconds: Property[int] = Property.ofValue(10800)
    break_at_end_lsn: Property[bool] = Property.ofValue(true)
    max_run_seconds: Property[int] = Property.ofValue(43200)
    debug_lsn: Property[bool] = Property.ofValue(false)
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    filter_schemas: Property[list[str]] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
