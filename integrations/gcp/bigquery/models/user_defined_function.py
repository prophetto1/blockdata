from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\UserDefinedFunction.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class UserDefinedFunction:
    type: Property[com.google.cloud.bigquery.UserDefinedFunction.Type] | None = None
    content: Property[str] | None = None

    @staticmethod
    def of(user_defined_function: com.google.cloud.bigquery.UserDefinedFunction) -> UserDefinedFunction.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.UserDefinedFunction:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        type: com.google.cloud.bigquery.UserDefinedFunction.Type | None = None
        content: str | None = None
