from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\model\Owner.java
# WARNING: Unresolved types: io, messages, minio

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Owner:
    id: str | None = None
    display_name: str | None = None

    @staticmethod
    def of(owner: io.minio.messages.Owner) -> Owner:
        raise NotImplementedError  # TODO: translate from Java
