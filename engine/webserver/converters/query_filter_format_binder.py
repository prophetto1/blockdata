from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\converters\QueryFilterFormatBinder.java
# WARNING: Unresolved types: AnnotatedRequestArgumentBinder, ArgumentConversionContext, BindingResult, Class, Field, Matcher, Op, Pattern

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.models.query_filter import QueryFilter
from engine.webserver.converters.query_filter_format import QueryFilterFormat


@dataclass(slots=True, kw_only=True)
class QueryFilterFormatBinder:
    f_i_l_t_e_r__p_a_t_t_e_r_n: Pattern = Pattern.compile("filters\\[(.*?)]\\[(.*?)](?:\\[(.+)])?")

    @staticmethod
    def get_query_filters(query_params: dict[str, list[str]]) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    def get_annotation_type(self) -> Class[QueryFilterFormat]:
        raise NotImplementedError  # TODO: translate from Java

    def bind(self, context: ArgumentConversionContext[list[QueryFilter]], source: HttpRequest[Any]) -> BindingResult[list[QueryFilter]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_filters(values: list[str], matcher: Matcher, filters: list[QueryFilter], labels_by_operation: dict[QueryFilter.Op, dict[str, str]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_values(values: list[str], field: QueryFilter.Field, operation: QueryFilter.Op) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java
