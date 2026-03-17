from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\TestSuiteRunResult.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.test.test_state import TestState
from engine.core.test.flow.unit_test_result import UnitTestResult


@dataclass(slots=True, kw_only=True)
class TestSuiteRunResult:
    id: str | None = None
    test_suite_id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    state: TestState | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    results: list[UnitTestResult] | None = None

    @staticmethod
    def of(id: str, test_suite_id: str, namespace: str, flow_id: str, start_date: datetime, end_date: datetime, results: list[UnitTestResult]) -> TestSuiteRunResult:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_disabled_test_suite(id: str, test_suite_id: str, namespace: str, flow_id: str) -> TestSuiteRunResult:
        raise NotImplementedError  # TODO: translate from Java
