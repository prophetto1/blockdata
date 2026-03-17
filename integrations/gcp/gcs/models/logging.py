from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Logging:
    log_bucket: str | None = None
    log_object_prefix: str | None = None

    def of(self, item: BucketInfo) -> Logging:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self) -> BucketInfo:
        raise NotImplementedError  # TODO: translate from Java
