from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\models\Metadata.java
# WARNING: Unresolved types: ManagedFieldsEntry, ObjectMeta, OwnerReference

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Metadata:
    uid: str | None = None
    name: str | None = None
    namespace: str | None = None
    cluster_name: str | None = None
    annotations: dict[str, str] | None = None
    labels: dict[str, str] | None = None
    creation_timestamp: datetime | None = None
    deletion_grace_period_seconds: int | None = None
    deletion_timestamp: datetime | None = None
    finalizers: list[str] | None = None
    generate_name: str | None = None
    generation: int | None = None
    managed_fields: list[ManagedFieldsEntry] | None = None
    owner_references: list[OwnerReference] | None = None
    resource_version: str | None = None
    self_link: str | None = None

    @staticmethod
    def from(meta: ObjectMeta) -> Metadata:
        raise NotImplementedError  # TODO: translate from Java
