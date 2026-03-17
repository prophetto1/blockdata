from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_load import AbstractLoad
from integrations.gcp.bigquery.load_csv_validation import LoadCsvValidation


@dataclass(slots=True, kw_only=True)
class LoadCsvValidator(ConstraintValidator):

    def is_valid(self, value: AbstractLoad, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
