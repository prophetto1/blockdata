from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlMultipleConditionStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_multiple_condition_storage import AbstractJdbcMultipleConditionStorage
from engine.core.models.conditions.condition import Condition
from engine.core.models.triggers.multipleflows.multiple_condition_window import MultipleConditionWindow
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlMultipleConditionStorage(AbstractJdbcMultipleConditionStorage):

    def get_end_data_condition(self) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
