from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\context\TestRunContextFactory.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory


@dataclass(slots=True, kw_only=True)
class TestRunContextFactory(RunContextFactory):

    def of(self, id: str | None = None, namespace: str | None = None, tenant_id: str | None = None) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java
