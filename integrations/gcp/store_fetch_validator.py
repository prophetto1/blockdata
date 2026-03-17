from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.surrealdb.query_interface import QueryInterface
from integrations.gcp.bigquery.store_fetch_validation import StoreFetchValidation


@dataclass(slots=True, kw_only=True)
class StoreFetchValidator(ConstraintValidator):

    def is_valid(self, value: QueryInterface, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
