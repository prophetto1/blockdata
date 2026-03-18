from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\BigQuery.java
# WARNING: Unresolved types: IOException

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class BigQuery(AbstractPythonTap):
    """Fetch data from BigQuery with a Singer tap."""
    streams: list[Stream]
    limit: Property[int]
    start_date_time: datetime
    start_always_inclusive: Property[bool] = Property.ofValue(true)
    service_account: Property[str] | None = None
    end_date_time: datetime | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def environment_variables(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Stream:
        name: str | None = None
        table: str | None = None
        columns: list[str] | None = None
        datetime_key: str | None = None
        filters: list[str] | None = None
