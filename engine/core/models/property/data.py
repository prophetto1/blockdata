from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\Data.java
# WARNING: Unresolved types: Class, Flux, Function, ObjectMapper, T

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Data:
    m_a_p__o_f__s_t_r_i_n_g__o_b_j_e_c_t: Class[dict[str, Any]] = (Class<Map<String, Object>>) Map.of().getClass()
    j_s_o_n__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()
        .copy()
        .configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true)
    from: Any | None = None

    @staticmethod
    def from(from: Any) -> Data:
        raise NotImplementedError  # TODO: translate from Java

    def read(self, run_context: RunContext) -> Flux[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def read_as(self, run_context: RunContext, clazz: Class[T], mapper: Function[dict[str, Any], T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    class From(Protocol):
        def get_from(self) -> Any: ...
