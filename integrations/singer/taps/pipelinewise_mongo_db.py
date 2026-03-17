from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewiseMongoDb(AbstractPythonTap, RunnableTask):
    """Fetch data from a MongoDB database with a Singer tap."""
    host: str
    username: str
    password: Property[str] | None = None
    port: Property[int]
    database: Property[str]
    auth_database: Property[str]
    ssl: Property[bool] | None = None
    ssl_verify: Property[bool] | None = None
    replica_set: Property[str] | None = None
    include_schema_in_stream: Property[bool] | None = None
    update_buffer_size: Property[int] | None = None
    await_time_ms: Property[int] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
