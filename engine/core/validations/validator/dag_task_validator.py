from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\DagTaskValidator.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.flow.dag import Dag
from engine.core.validations.dag_task_validation import DagTaskValidation


@dataclass(slots=True, kw_only=True)
class DagTaskValidator:

    def is_valid(self, value: Dag, annotation_metadata: AnnotationValue[DagTaskValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
