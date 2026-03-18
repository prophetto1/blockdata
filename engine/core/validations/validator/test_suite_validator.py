from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\TestSuiteValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.services.flow_service import FlowService
from engine.core.test.test_suite import TestSuite
from engine.core.validations.test_suite_validation import TestSuiteValidation


@dataclass(slots=True, kw_only=True)
class TestSuiteValidator:
    flow_service: FlowService | None = None

    def is_valid(self, value: TestSuite, annotation_metadata: AnnotationValue[TestSuiteValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
