from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\Assertion.java

from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from engine.core.test.flow.assertion_result import AssertionResult
from engine.core.test.flow.assertion_run_error import AssertionRunError
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Assertion:
    value: Property[Any]
    task_id: str | None = None
    error_message: Property[str] | None = None
    description: Property[str] | None = None
    ends_with: Property[str] | None = None
    starts_with: Property[str] | None = None
    contains: Property[str] | None = None
    equal_to: Property[Any] | None = None
    not_equal_to: Property[Any] | None = None
    greater_than: Property[float] | None = None
    greater_than_or_equal_to: Property[float] | None = None
    less_than: Property[float] | None = None
    less_than_or_equal_to: Property[float] | None = None
    in: Property[list[str]] | None = None
    not_in: Property[list[str]] | None = None
    is_null: Property[bool] | None = None
    is_not_null: Property[bool] | None = None

    def has_at_least_one_assertion(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> AssertionRunResult:
        raise NotImplementedError  # TODO: translate from Java

    def get_displayable_assertion(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_is_null_result(self, operator: Operator, is_null_expected: bool, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], user_error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def equal_to(self, expected_value: Any, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def not_equal_to(self, expected_value: Any, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def ends_with(self, expected_value: str, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def starts_with(self, expected_value: str, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def contains(self, expected_value: str, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than(self, expected_value: float, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than_or_equal_to(self, expected_value: float, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def less_than(self, expected_value: float, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def less_than_or_equal_to(self, expected_value: float, actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def try_to_parse_double(self, x: Any) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def in(self, expected_in_list: list[str], actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    def not_in(self, not_expected_in_list: list[str], actual_value_query: str, actual_value: Any, task_id: Optional[str], description: Optional[str], error_message: Optional[str]) -> AssertionResult:
        raise NotImplementedError  # TODO: translate from Java

    class Operator(str, Enum):
        ENDS_WITH = "ENDS_WITH"
        STARTS_WITH = "STARTS_WITH"
        CONTAINS = "CONTAINS"
        EQUAL_TO = "EQUAL_TO"
        NOT_EQUAL_TO = "NOT_EQUAL_TO"
        GREATER_THAN = "GREATER_THAN"
        GREATER_THAN_OR_EQUAL_TO = "GREATER_THAN_OR_EQUAL_TO"
        LESS_THAN = "LESS_THAN"
        LESS_THAN_OR_EQUAL_TO = "LESS_THAN_OR_EQUAL_TO"
        IN = "IN"
        NOT_IN = "NOT_IN"
        IS_NULL = "IS_NULL"
        IS_NOT_NULL = "IS_NOT_NULL"

    @dataclass(slots=True)
    class AssertionRunResult:
        results: list[AssertionResult] | None = None
        errors: list[AssertionRunError] | None = None
