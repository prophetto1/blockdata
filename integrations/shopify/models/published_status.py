from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\models\PublishedStatus.java

from enum import Enum
from typing import Any


class PublishedStatus(str, Enum):
    PUBLISHED = "PUBLISHED"
    UNPUBLISHED = "UNPUBLISHED"
    ANY = "ANY"
