from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\StoreFetchDestinationValidator.java
# WARNING: Unresolved types: ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from integrations.aws.athena.query import Query
from integrations.gcp.bigquery.store_fetch_destination_validation import StoreFetchDestinationValidation


@dataclass(slots=True, kw_only=True)
class StoreFetchDestinationValidator:

    def is_valid(self, value: Query, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
