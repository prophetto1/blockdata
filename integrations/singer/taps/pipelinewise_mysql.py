from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\PipelinewiseMysql.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewiseMysql(AbstractPythonTap):
    """Fetch data from a MySQL database with a Singer tap."""
    host: str
    username: str
    port: Property[int]
    ssl: Property[bool] = Property.ofValue(false)
    export_batch_rows: Property[int] = Property.ofValue(50000)
    session_sqls: Property[list[str]] = Property.ofValue(Arrays.asList(
        "SET @@session.time_zone=\"+0:00\"",
        "SET @@session.wait_timeout=28800",
        "SET @@session.net_read_timeout=3600",
        "SET @@session.innodb_lock_wait_timeout=3600"
    ))
    pip_package: ClassVar[str] = "pipelinewise-tap-mysql"
    comand: ClassVar[str] = "tap-mysql"
    password: Property[str] | None = None
    filter_dbs: Property[list[str]] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
