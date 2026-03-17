from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\AbstractWebhookValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.core.validations.abstract_webhook_validation import AbstractWebhookValidation


@dataclass(slots=True, kw_only=True)
class AbstractWebhookValidator:
    allowed_content_types: ClassVar[set[str]]

    def is_valid(self, value: AbstractWebhookTrigger, annotation_metadata: AnnotationValue[AbstractWebhookValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
