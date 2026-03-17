from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\AbstractWebhookValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.core.validations.abstract_webhook_validation import AbstractWebhookValidation


@dataclass(slots=True, kw_only=True)
class AbstractWebhookValidator:
    a_l_l_o_w_e_d__c_o_n_t_e_n_t__t_y_p_e_s: set[str] = Set.of(
        MediaType.APPLICATION_JSON,
        MediaType.TEXT_PLAIN
    )

    def is_valid(self, value: AbstractWebhookTrigger, annotation_metadata: AnnotationValue[AbstractWebhookValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
