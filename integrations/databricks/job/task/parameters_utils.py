from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\ParametersUtils.java
# WARNING: Unresolved types: CollectionType, MapType, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ParametersUtils:
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    l_i_s_t__o_f__s_t_r_i_n_g: ClassVar[CollectionType] = OBJECT_MAPPER.getTypeFactory().constructCollectionType(List.class, String.class)
    m_a_p__o_f__s_t_r_i_n_g__s_t_r_i_n_g: ClassVar[MapType] = OBJECT_MAPPER.getTypeFactory().constructMapType(Map.class, String.class, String.class)

    @staticmethod
    def list_parameters(run_context: RunContext, parameters: Any) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_parameters(run_context: RunContext, parameters: Any) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java
