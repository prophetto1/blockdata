from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2ConcurrencyLimitStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_concurrency_limit_storage import AbstractJdbcConcurrencyLimitStorage
from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.repository.h2.h2_repository import H2Repository


@dataclass(slots=True, kw_only=True)
class H2ConcurrencyLimitStorage(AbstractJdbcConcurrencyLimitStorage):
    pass
