from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\model\MinioObject.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.microsoft365.sharepoint.models.item import Item
from integrations.aws.s3.models.owner import Owner


@dataclass(slots=True, kw_only=True)
class MinioObject:
    uri: str | None = None
    key: str | None = None
    etag: str | None = None
    size: int | None = None
    last_modified: datetime | None = None
    owner: Owner | None = None

    @staticmethod
    def of(object: Item) -> MinioObject:
        raise NotImplementedError  # TODO: translate from Java
