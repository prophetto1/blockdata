from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\PolicyTags.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PolicyTags:
    names: Property[list[str]] | None = None

    @staticmethod
    def of(policy_tags: com.google.cloud.bigquery.PolicyTags) -> PolicyTags.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.PolicyTags:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        names: list[str] | None = None
