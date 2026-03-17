from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.apify.apify_connection import ApifyConnection
from integrations.apify.apify_sort_direction import ApifySortDirection
from engine.core.models.property.property import Property
from engine.core.utils.retry_utils import RetryUtils
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractGetDataset(ApifyConnection):
    dataset_id: Property[str]
    clean: Property[bool] | None = None
    offset: Property[int] | None = None
    limit: Property[int] | None = None
    fields: Property[list[String]] | None = None
    omit: Property[list[String]] | None = None
    unwind: Property[list[String]] | None = None
    flatten: Property[bool] | None = None
    sort: Property[ApifySortDirection] | None = None
    skip_empty: Property[bool] | None = None
    skip_failed_pages: Property[bool] | None = None
    view: Property[str] | None = None
    skip_hidden: Property[bool] | None = None
    simplified: Property[bool] | None = None
    d_e_f_a_u_l_t__t_i_m_e_o_u_t__d_u_r_a_t_i_o_n: timedelta | None = None
    d_e_f_a_u_l_t__m_a_x__i_n_t_e_r_v_a_l__d_u_r_a_t_i_o_n: timedelta | None = None

    def build_u_r_l(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def with_retry(self, run_context: RunContext, retry_if_predicate: Predicate[T], run: RetryUtils) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def retry_logger_wrapper(self, retry_if_predicate: Predicate[T], run_context: RunContext) -> Predicate[T]:
        raise NotImplementedError  # TODO: translate from Java
