from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\models\ProductStatus.java

from enum import Enum
from typing import Any


class ProductStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DRAFT = "DRAFT"
