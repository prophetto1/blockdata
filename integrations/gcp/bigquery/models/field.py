from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\Field.java
# WARNING: Unresolved types: Mode, StandardSQLTypeName, bigquery, cloud, com, google

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.gcp.bigquery.models.policy_tags import PolicyTags
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Field:
    name: Property[str] | None = None
    type: Property[StandardSQLTypeName] | None = None
    sub_fields: list[Field] | None = None
    mode: Property[com.google.cloud.bigquery.Field.Mode] | None = None
    description: Property[str] | None = None
    policy_tags: PolicyTags | None = None

    @staticmethod
    def of(field: com.google.cloud.bigquery.Field) -> Field.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.Field:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        name: str | None = None
        type: StandardSQLTypeName | None = None
        sub_fields: list[Field.Output] | None = None
        mode: com.google.cloud.bigquery.Field.Mode | None = None
        description: str | None = None
        policy_tags: PolicyTags.Output | None = None
