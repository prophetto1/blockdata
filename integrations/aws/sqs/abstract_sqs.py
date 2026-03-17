from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.aws.sqs.sqs_connection_interface import SqsConnectionInterface


@dataclass(slots=True, kw_only=True)
class AbstractSqs(AbstractConnection, SqsConnectionInterface):
    """Shared SQS connection"""
    r_e_t_r_y__s_t_r_a_t_e_g_y__b_a_c_k_o_f_f__b_a_s_e__d_e_l_a_y: timedelta | None = None
    r_e_t_r_y__s_t_r_a_t_e_g_y__b_a_c_k_o_f_f__m_a_x__d_e_l_a_y: timedelta | None = None
    queue_url: Property[str] | None = None
    max_concurrency: Property[int] | None = None
    connection_acquisition_timeout: Property[timedelta] | None = None

    def client(self, run_context: RunContext) -> SqsClient:
        raise NotImplementedError  # TODO: translate from Java

    def async_client(self, run_context: RunContext) -> SqsAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

    def async_client(self, run_context: RunContext, retry_max_attempts: int) -> SqsAsyncClient:
        raise NotImplementedError  # TODO: translate from Java
