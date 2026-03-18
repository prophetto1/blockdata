from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\StoreFetchValidator.java
# WARNING: Unresolved types: ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from integrations.cassandra.query_interface import QueryInterface
from integrations.gcp.bigquery.store_fetch_validation import StoreFetchValidation


@dataclass(slots=True, kw_only=True)
class StoreFetchValidator:

    def is_valid(self, value: QueryInterface, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
