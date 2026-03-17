from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.weaviate.query import Query
from integrations.gcp.bigquery.store_fetch_destination_validation import StoreFetchDestinationValidation


@dataclass(slots=True, kw_only=True)
class StoreFetchDestinationValidator(ConstraintValidator):

    def is_valid(self, value: Query, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
