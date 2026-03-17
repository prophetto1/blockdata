from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\LoadCsvValidator.java
# WARNING: Unresolved types: ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_load import AbstractLoad
from integrations.gcp.bigquery.load_csv_validation import LoadCsvValidation


@dataclass(slots=True, kw_only=True)
class LoadCsvValidator:

    def is_valid(self, value: AbstractLoad, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
