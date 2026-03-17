from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Bucket:
    name: str | None = None
    uri: str | None = None
    location: str | None = None
    index_page: str | None = None
    not_found_page: str | None = None

    def of(self, bucket: com) -> Bucket:
        raise NotImplementedError  # TODO: translate from Java
