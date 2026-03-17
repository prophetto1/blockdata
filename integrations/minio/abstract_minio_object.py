from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.minio.abstract_minio import AbstractMinio
from integrations.minio.minio_connection import MinioConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractMinioObject(MinioConnection, AbstractMinio):
    bucket: Property[str] | None = None
