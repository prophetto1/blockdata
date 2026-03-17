from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.gcs.models.storage_class import StorageClass


class Type(str, Enum):
    DELETE = "DELETE"
    SET_STORAGE_CLASS = "SET_STORAGE_CLASS"


class LifecycleAction(Protocol):
    def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo: ...


@dataclass(slots=True, kw_only=True)
class BucketLifecycleRule:
    condition: Condition
    action: Action

    def convert(self, rules: list[BucketLifecycleRule], run_context: RunContext) -> list[BucketInfo]:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, run_context: RunContext) -> BucketInfo:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Condition:
        age: Property[int]

    @dataclass(slots=True)
    class Action:
        type: Property[Type]
        value: Property[str] | None = None

    @dataclass(slots=True)
    class DeleteAction(LifecycleAction):

        def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SetStorageAction(LifecycleAction):
        storage_class: Property[StorageClass]

        def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Condition:
    age: Property[int]


@dataclass(slots=True, kw_only=True)
class Action:
    type: Property[Type]
    value: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class DeleteAction(LifecycleAction):

    def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class SetStorageAction(LifecycleAction):
    storage_class: Property[StorageClass]

    def convert(self, condition: Condition, run_context: RunContext) -> BucketInfo:
        raise NotImplementedError  # TODO: translate from Java
