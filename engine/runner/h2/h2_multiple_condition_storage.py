from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2MultipleConditionStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_multiple_condition_storage import AbstractJdbcMultipleConditionStorage
from engine.repository.h2.h2_repository import H2Repository
from engine.core.models.triggers.multipleflows.multiple_condition_window import MultipleConditionWindow


@dataclass(slots=True, kw_only=True)
class H2MultipleConditionStorage(AbstractJdbcMultipleConditionStorage):
    pass
