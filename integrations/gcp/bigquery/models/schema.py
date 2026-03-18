from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\Schema.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.models.field import Field
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Schema:
    fields: list[Field] | None = None

    @staticmethod
    def of(schema: com.google.cloud.bigquery.Schema) -> Schema.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.Schema:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        fields: list[Field.Output] | None = None
