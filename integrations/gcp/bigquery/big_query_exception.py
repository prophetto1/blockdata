from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\BigQueryException.java
# WARNING: Unresolved types: BigQueryError, Exception

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class BigQueryException(Exception):
    errors: list[BigQueryError] | None = None
