from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-prefect\src\main\java\io\kestra\plugin\prefect\PrefectResponse.java
# WARNING: Unresolved types: Class, IOException, ObjectMapper, T, http, java, net

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class PrefectResponse:
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()

    @staticmethod
    def check_error(response: java.net.http.HttpResponse[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_response(response: java.net.http.HttpResponse[str], clazz: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_response_as_map(response: java.net.http.HttpResponse[str]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
