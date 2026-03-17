from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\AbstractS3Object.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from integrations.aws.s3.abstract_s3_object_interface import AbstractS3ObjectInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractS3Object(ABC, AbstractConnection):
    """Shared S3 object task base"""
    request_payer: Property[str] | None = None
    bucket: Property[str] | None = None
