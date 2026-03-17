from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\Logging.java
# WARNING: Unresolved types: BucketInfo

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Logging:
    log_bucket: str | None = None
    log_object_prefix: str | None = None

    @staticmethod
    def of(item: BucketInfo.Logging) -> Logging:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self) -> BucketInfo.Logging:
        raise NotImplementedError  # TODO: translate from Java
