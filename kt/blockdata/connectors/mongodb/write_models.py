from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class WriteModel:
    pass


@dataclass(slots=True)
class InsertOneModel(WriteModel):
    document: dict[str, Any]


@dataclass(slots=True)
class ReplaceOneModel(WriteModel):
    filter: dict[str, Any]
    replacement: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class UpdateOneModel(WriteModel):
    filter: dict[str, Any]
    update: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class UpdateManyModel(WriteModel):
    filter: dict[str, Any]
    update: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DeleteOneModel(WriteModel):
    filter: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DeleteManyModel(WriteModel):
    filter: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class BulkWriteSummary:
    inserted_count: int = 0
    matched_count: int = 0
    modified_count: int = 0
    deleted_count: int = 0
