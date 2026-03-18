from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\Bucket.java
# WARNING: Unresolved types: cloud, com, google, storage

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Bucket:
    name: str | None = None
    uri: str | None = None
    location: str | None = None
    index_page: str | None = None
    not_found_page: str | None = None

    @staticmethod
    def of(bucket: com.google.cloud.storage.Bucket) -> Bucket:
        raise NotImplementedError  # TODO: translate from Java
