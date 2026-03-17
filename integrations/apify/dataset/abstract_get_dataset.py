from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\dataset\AbstractGetDataset.java
# WARNING: Unresolved types: CheckedSupplier, Exception, Predicate, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.apify.apify_connection import ApifyConnection
from integrations.apify.apify_sort_direction import ApifySortDirection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.utils.retry_utils import RetryUtils
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractGetDataset(ABC, ApifyConnection):
    dataset_id: Property[str]
    clean: Property[bool] = Property.ofValue(true)
    offset: Property[int] = Property.ofValue(0)
    limit: Property[int] = Property.ofValue(1000)
    flatten: Property[bool] = Property.ofValue(false)
    sort: Property[ApifySortDirection] = Property.ofValue(ApifySortDirection.ASC)
    skip_empty: Property[bool] = Property.ofValue(true)
    skip_failed_pages: Property[bool] = Property.ofValue(false)
    skip_hidden: Property[bool] = Property.ofValue(false)
    simplified: Property[bool] = Property.ofValue(false)
    d_e_f_a_u_l_t__t_i_m_e_o_u_t__d_u_r_a_t_i_o_n: timedelta = Duration.ofSeconds(300)
    d_e_f_a_u_l_t__m_a_x__i_n_t_e_r_v_a_l__d_u_r_a_t_i_o_n: timedelta = Duration.ofSeconds(32)
    fields: Property[list[str]] | None = None
    omit: Property[list[str]] | None = None
    unwind: Property[list[str]] | None = None
    view: Property[str] | None = None

    def build_u_r_l(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def with_retry(self, run_context: RunContext, retry_if_predicate: Predicate[T], run: RetryUtils.CheckedSupplier[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def retry_logger_wrapper(retry_if_predicate: Predicate[T], run_context: RunContext) -> Predicate[T]:
        raise NotImplementedError  # TODO: translate from Java
