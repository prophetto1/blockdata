from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airtable\src\main\java\io\kestra\plugin\airtable\AirtableException.java
# WARNING: Unresolved types: Exception, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AirtableException(Exception):
    pass
