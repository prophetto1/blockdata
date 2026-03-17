from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\models\S3Object.java
# WARNING: Unresolved types: amazon, awssdk, model, s3, services, software

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.aws.s3.models.owner import Owner


@dataclass(slots=True, kw_only=True)
class S3Object:
    uri: str | None = None
    key: str | None = None
    etag: str | None = None
    size: int | None = None
    last_modified: datetime | None = None
    owner: Owner | None = None

    @staticmethod
    def of(object: software.amazon.awssdk.services.s3.model.S3Object) -> S3Object:
        raise NotImplementedError  # TODO: translate from Java
