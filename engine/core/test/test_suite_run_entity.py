from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\TestSuiteRunEntity.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.has_uid import HasUID
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.tenant_interface import TenantInterface
from engine.core.test.test_state import TestState
from engine.core.test.test_suite_run_result import TestSuiteRunResult
from engine.core.test.test_suite_uid import TestSuiteUid
from engine.core.test.flow.unit_test_result import UnitTestResult


@dataclass(slots=True, kw_only=True)
class TestSuiteRunEntity:
    uid: str | None = None
    id: str | None = None
    tenant_id: str | None = None
    deleted: bool | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    test_suite_id: str | None = None
    test_suite_uid: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    state: TestState | None = None
    results: list[UnitTestResult] | None = None

    @staticmethod
    def create(tenant_id: str, test_suite_uid: TestSuiteUid, test_suite_run_result: TestSuiteRunResult) -> TestSuiteRunEntity:
        raise NotImplementedError  # TODO: translate from Java

    def migrate_to_tenant(self, new_tenant_id: str) -> TestSuiteRunEntity:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> TestSuiteRunEntity:
        raise NotImplementedError  # TODO: translate from Java

    def to_model(self) -> TestSuiteRunResult:
        raise NotImplementedError  # TODO: translate from Java
