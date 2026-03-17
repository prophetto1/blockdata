from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class Metadata:
    uid: str | None = None
    name: str | None = None
    namespace: str | None = None
    cluster_name: str | None = None
    annotations: dict[String, String] | None = None
    labels: dict[String, String] | None = None
    creation_timestamp: datetime | None = None
    deletion_grace_period_seconds: int | None = None
    deletion_timestamp: datetime | None = None
    finalizers: list[String] | None = None
    generate_name: str | None = None
    generation: int | None = None
    managed_fields: list[ManagedFieldsEntry] | None = None
    owner_references: list[OwnerReference] | None = None
    resource_version: str | None = None
    self_link: str | None = None

    def from(self, meta: ObjectMeta) -> Metadata:
        raise NotImplementedError  # TODO: translate from Java
