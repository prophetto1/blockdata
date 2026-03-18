from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fivetran\src\main\java\io\kestra\plugin\fivetran\models\SetupTestResultResponse.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class SetupTestResultResponse:
    title: str = None
    status: str = None
    message: str = None
    details: Any = None
