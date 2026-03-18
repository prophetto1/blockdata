from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\OrderBy.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.order import Order


@dataclass(slots=True, kw_only=True)
class OrderBy:
    column: str
    order: Order = Order.ASC
