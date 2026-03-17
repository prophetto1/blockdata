from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class IamConfiguration:
    uniform_bucket_level_access_enabled: bool | None = None
    public_access_prevention: BucketInfo | None = None

    def of(self, item: BucketInfo) -> IamConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self) -> BucketInfo:
        raise NotImplementedError  # TODO: translate from Java
