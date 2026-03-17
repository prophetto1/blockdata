from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\ViewDefinition.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.user_defined_function import UserDefinedFunction


@dataclass(slots=True, kw_only=True)
class ViewDefinition:
    query: Property[str] | None = None
    view_user_defined_functions: list[UserDefinedFunction] | None = None

    @staticmethod
    def of(view_definition: com.google.cloud.bigquery.ViewDefinition) -> ViewDefinition.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.ViewDefinition:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        query: str | None = None
        view_user_defined_functions: list[UserDefinedFunction.Output] | None = None
