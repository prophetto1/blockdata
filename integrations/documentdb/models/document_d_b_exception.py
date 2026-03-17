from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\models\DocumentDBException.java
# WARNING: Unresolved types: Exception, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class DocumentDBException(Exception):
    pass
