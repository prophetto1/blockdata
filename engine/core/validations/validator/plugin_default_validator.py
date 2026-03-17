from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\PluginDefaultValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.plugin_default import PluginDefault
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.validations.plugin_default_validation import PluginDefaultValidation


@dataclass(slots=True, kw_only=True)
class PluginDefaultValidator:
    plugin_default_service: PluginDefaultService | None = None

    def is_valid(self, value: PluginDefault, annotation_metadata: AnnotationValue[PluginDefaultValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def add_constraint_violation(context: ConstraintValidatorContext, violations: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java
