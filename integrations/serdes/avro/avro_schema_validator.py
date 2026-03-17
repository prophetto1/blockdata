from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.serdes.avro.avro_schema_validation import AvroSchemaValidation


@dataclass(slots=True, kw_only=True)
class AvroSchemaValidator(ConstraintValidator):

    def is_valid(self, value: str, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
