from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\WebhookValidator.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.trigger.webhook import Webhook
from engine.core.validations.webhook_validation import WebhookValidation


@dataclass(slots=True, kw_only=True)
class WebhookValidator:
    allowed_content_types: ClassVar[set[str]]

    def is_valid(self, value: Webhook, annotation_metadata: AnnotationValue[WebhookValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
