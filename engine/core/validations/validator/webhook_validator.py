from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\WebhookValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.trigger.webhook import Webhook
from engine.core.validations.webhook_validation import WebhookValidation


@dataclass(slots=True, kw_only=True)
class WebhookValidator:
    a_l_l_o_w_e_d__c_o_n_t_e_n_t__t_y_p_e_s: ClassVar[set[str]] = Set.of(
        MediaType.APPLICATION_JSON,
        MediaType.TEXT_PLAIN
    )

    def is_valid(self, value: Webhook, annotation_metadata: AnnotationValue[WebhookValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
