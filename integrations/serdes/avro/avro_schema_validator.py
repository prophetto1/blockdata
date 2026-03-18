from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\AvroSchemaValidator.java
# WARNING: Unresolved types: ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from integrations.serdes.avro.avro_schema_validation import AvroSchemaValidation


@dataclass(slots=True, kw_only=True)
class AvroSchemaValidator:

    def is_valid(self, value: str, context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
