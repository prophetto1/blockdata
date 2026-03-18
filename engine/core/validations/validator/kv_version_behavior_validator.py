from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\KvVersionBehaviorValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.validations.kv_version_behavior_validation import KvVersionBehaviorValidation
from engine.plugin.core.kv.version import Version


@dataclass(slots=True, kw_only=True)
class KvVersionBehaviorValidator:

    def is_valid(self, value: Version, annotation_metadata: AnnotationValue[KvVersionBehaviorValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
