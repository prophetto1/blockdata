from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\Order.java

from enum import Enum
from typing import Any


class Order(str, Enum):
    ASC = "ASC"
    DESC = "DESC"
