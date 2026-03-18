from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\Load.java
# WARNING: Unresolved types: BufferedReader, BulkOperation, Flux, IOException

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_load import AbstractLoad
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.elasticsearch.model.op_type import OpType
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    """Bulk load records from Internal Storage"""
    index: Property[str]
    remove_id_key: Property[bool] = Property.ofValue(true)
    op_type: Property[OpType] | None = None
    id_key: Property[str] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        raise NotImplementedError  # TODO: translate from Java
