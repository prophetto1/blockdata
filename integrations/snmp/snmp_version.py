from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-snmp\src\main\java\io\kestra\plugin\snmp\SnmpVersion.java
# WARNING: Unresolved types: Address, Built, PDU, Snmp, Target, V3Security, VarBind, Variable

from enum import Enum
from typing import Any

from integrations.snmp.abstract_snmp_task import AbstractSnmpTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


class SnmpVersion(str, Enum):
    V1 = "V1"
    V2C = "V2C"
    V3 = "V3"
