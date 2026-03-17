from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\models\Owner.java
# WARNING: Unresolved types: amazon, awssdk, model, s3, services, software

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Owner:
    id: str | None = None
    display_name: str | None = None

    @staticmethod
    def of(object: software.amazon.awssdk.services.s3.model.Owner) -> Owner:
        raise NotImplementedError  # TODO: translate from Java
