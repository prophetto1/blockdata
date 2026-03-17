from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from integrations.aws.s3.abstract_s3_object_interface import AbstractS3ObjectInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractS3Object(AbstractConnection, AbstractS3ObjectInterface):
    """Shared S3 object task base"""
    request_payer: Property[str] | None = None
    bucket: Property[str] | None = None
