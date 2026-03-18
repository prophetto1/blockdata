from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\dynamodb\Scan.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.aws.dynamodb.abstract_dynamo_db import AbstractDynamoDb
from engine.core.models.tasks.common.fetch_output import FetchOutput
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Scan(AbstractDynamoDb):
    """Scan items from a DynamoDB table"""
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    limit: Property[int] | None = None
    filter_expression: Property[str] | None = None
    expression_attribute_values: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> FetchOutput:
        raise NotImplementedError  # TODO: translate from Java
