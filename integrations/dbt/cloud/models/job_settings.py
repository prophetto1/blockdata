from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\JobSettings.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JobSettings:
    threads: int | None = None
    target_name: str | None = None
