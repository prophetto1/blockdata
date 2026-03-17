from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\UnitTestResult.java

from dataclasses import dataclass
from typing import Any

from engine.core.test.flow.assertion_result import AssertionResult
from engine.core.test.flow.assertion_run_error import AssertionRunError
from engine.core.test.flow.fixtures import Fixtures
from engine.core.test.test_state import TestState


@dataclass(slots=True, kw_only=True)
class UnitTestResult:
    test_id: str | None = None
    test_type: str | None = None
    execution_id: str | None = None
    url: str | None = None
    state: TestState | None = None
    assertion_results: list[AssertionResult] | None = None
    errors: list[AssertionRunError] | None = None
    fixtures: Fixtures | None = None

    @staticmethod
    def of(unit_test_id: str, unit_test_type: str, execution_id: str, url: str, results: list[AssertionResult], errors: list[AssertionRunError], fixtures: Fixtures) -> UnitTestResult:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_disabled(unit_test_id: str, unit_test_type: str, fixtures: Fixtures) -> UnitTestResult:
        raise NotImplementedError  # TODO: translate from Java
