from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\Data.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class Data:
    size: int | None = None
    count: int | None = None
    value: Any | None = None
    uri: str | None = None
