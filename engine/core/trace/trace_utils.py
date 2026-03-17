from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\TraceUtils.java
# WARNING: Unresolved types: AttributeKey, Attributes, Class

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TraceUtils:
    a_t_t_r__u_i_d: ClassVar[AttributeKey[str]] = AttributeKey.stringKey("kestra.uid")
    a_t_t_r__t_e_n_a_n_t__i_d: ClassVar[AttributeKey[str]] = AttributeKey.stringKey("kestra.tenantId")
    a_t_t_r__n_a_m_e_s_p_a_c_e: ClassVar[AttributeKey[str]] = AttributeKey.stringKey("kestra.namespace")
    a_t_t_r__f_l_o_w__i_d: ClassVar[AttributeKey[str]] = AttributeKey.stringKey("kestra.flowId")
    a_t_t_r__e_x_e_c_u_t_i_o_n__i_d: ClassVar[AttributeKey[str]] = AttributeKey.stringKey("kestra.executionId")
    a_t_t_r__s_o_u_r_c_e: ClassVar[AttributeKey[str]] = AttributeKey.stringKey("kestra.source")

    @staticmethod
    def attributes_from(execution: Execution) -> Attributes:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def attributes_from(run_context: RunContext) -> Attributes:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def attributes_from(clazz: Class[Any]) -> Attributes:
        raise NotImplementedError  # TODO: translate from Java
