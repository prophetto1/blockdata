from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\PipelinewiseMongoDb.java

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
class PipelinewiseMongoDb(AbstractPythonTap):
    """Fetch data from a MongoDB database with a Singer tap."""
    host: str
    username: str
    port: Property[int]
    database: Property[str]
    auth_database: Property[str]
    ssl: Property[bool] = Property.ofValue(false)
    ssl_verify: Property[bool] = Property.ofValue(true)
    include_schema_in_stream: Property[bool] = Property.ofValue(false)
    update_buffer_size: Property[int] = Property.ofValue(1)
    await_time_ms: Property[int] = Property.ofValue(1000)
    password: Property[str] | None = None
    replica_set: Property[str] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
