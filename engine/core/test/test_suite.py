from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\TestSuite.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_source import HasSource
from engine.core.models.has_uid import HasUID
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.tenant_interface import TenantInterface
from engine.core.test.flow.unit_test import UnitTest


@dataclass(slots=True, kw_only=True)
class TestSuite:
    id: str
    namespace: str
    flow_id: str
    test_cases: list[UnitTest]
    deleted: bool = Boolean.FALSE
    disabled: bool = Boolean.FALSE
    tenant_id: str | None = None
    description: str | None = None
    source: str | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, new_source: str, new_test_suite: TestSuite) -> TestSuite:
        raise NotImplementedError  # TODO: translate from Java

    def disable(self) -> TestSuite:
        raise NotImplementedError  # TODO: translate from Java

    def enable(self) -> TestSuite:
        raise NotImplementedError  # TODO: translate from Java

    def source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def toggle_disabled_in_yaml_source(yaml_source: str, disabled: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> TestSuite:
        raise NotImplementedError  # TODO: translate from Java
