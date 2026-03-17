from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\IamConfiguration.java
# WARNING: Unresolved types: BucketInfo, PublicAccessPrevention

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class IamConfiguration:
    uniform_bucket_level_access_enabled: bool | None = None
    public_access_prevention: BucketInfo.PublicAccessPrevention | None = None

    @staticmethod
    def of(item: BucketInfo.IamConfiguration) -> IamConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self) -> BucketInfo.IamConfiguration:
        raise NotImplementedError  # TODO: translate from Java
