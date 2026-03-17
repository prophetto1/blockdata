from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\AdswerveBigQuery.java
# WARNING: Unresolved types: Exception, IOException

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AdswerveBigQuery(AbstractPythonTarget):
    """Load data into a BigQuery with a Singer target."""
    project_id: str
    dataset_id: str
    validate_records: Property[bool] = Property.ofValue(false)
    add_metadata_columns: Property[bool] = Property.ofValue(false)
    replication_method: Property[ReplicationMethod] = Property.ofValue(ReplicationMethod.append)
    max_cache: Property[int] = Property.ofValue(50)
    merge_state_messages: Property[bool] = Property.ofValue(false)
    location: Property[str] | None = None
    table_prefix: Property[str] | None = None
    table_suffix: Property[str] | None = None
    service_account: Property[str] | None = None
    table_configs: Property[dict[str, Any]] | None = None

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def environment_variables(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class ReplicationMethod(str, Enum):
        append = "append"
        truncate = "truncate"
