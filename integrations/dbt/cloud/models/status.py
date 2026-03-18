from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\Status.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Status:
    code: int | None = None
    is_success: bool | None = None
    user_message: str | None = None
    developer_message: str | None = None
