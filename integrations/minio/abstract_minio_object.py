from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\AbstractMinioObject.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.minio.abstract_minio import AbstractMinio
from integrations.minio.minio_connection import MinioConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractMinioObject(ABC, MinioConnection):
    bucket: Property[str] | None = None
