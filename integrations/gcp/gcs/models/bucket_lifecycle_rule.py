from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\BucketLifecycleRule.java
# WARNING: Unresolved types: BucketInfo, LifecycleRule

from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.gcs.models.storage_class import StorageClass
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class BucketLifecycleRule:
    condition: Condition
    action: Action

    @staticmethod
    def convert(rules: list[BucketLifecycleRule], run_context: RunContext) -> list[BucketInfo.LifecycleRule]:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, run_context: RunContext) -> BucketInfo.LifecycleRule:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Condition:
        age: Property[int]

    @dataclass(slots=True)
    class Action:
        type: Property[Type]
        value: Property[str] | None = None

        class Type(str, Enum):
            DELETE = "DELETE"
            SET_STORAGE_CLASS = "SET_STORAGE_CLASS"

    @dataclass(slots=True)
    class DeleteAction:

        def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo.LifecycleRule:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SetStorageAction:
        storage_class: Property[StorageClass]

        def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo.LifecycleRule:
            raise NotImplementedError  # TODO: translate from Java

    class LifecycleAction(Protocol):
        def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo.LifecycleRule: ...
