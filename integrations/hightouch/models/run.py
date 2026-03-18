from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\models\Run.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Run:
    id: int | None = None
