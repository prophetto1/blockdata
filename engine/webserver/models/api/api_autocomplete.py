from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\api\ApiAutocomplete.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ApiAutocomplete:
    q: str | None = None
    ids: list[str] | None = None
    existing_only: bool | None = None
