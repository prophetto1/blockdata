from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-powerbi\src\main\java\io\kestra\plugin\powerbi\models\Refreshes.java

from dataclasses import dataclass
from typing import Any

from integrations.powerbi.models.refresh import Refresh


@dataclass(slots=True, kw_only=True)
class Refreshes:
    value: list[Refresh] | None = None
