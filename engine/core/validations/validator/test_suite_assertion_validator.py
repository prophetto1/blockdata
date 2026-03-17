from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\TestSuiteAssertionValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.test.flow.assertion import Assertion
from engine.core.validations.test_suite_assertion_validation import TestSuiteAssertionValidation


@dataclass(slots=True, kw_only=True)
class TestSuiteAssertionValidator:

    def is_valid(self, value: Assertion, annotation_metadata: AnnotationValue[TestSuiteAssertionValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
