from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\AbstractSqs.java
# WARNING: Unresolved types: SqsAsyncClient, SqsClient

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.aws.sqs.sqs_connection_interface import SqsConnectionInterface


@dataclass(slots=True, kw_only=True)
class AbstractSqs(ABC, AbstractConnection):
    """Shared SQS connection"""
    r_e_t_r_y__s_t_r_a_t_e_g_y__b_a_c_k_o_f_f__b_a_s_e__d_e_l_a_y: ClassVar[timedelta] = Duration.ofMillis(50)
    r_e_t_r_y__s_t_r_a_t_e_g_y__b_a_c_k_o_f_f__m_a_x__d_e_l_a_y: ClassVar[timedelta] = Duration.ofMillis(300)
    max_concurrency: Property[int] = Property.ofValue(50)
    connection_acquisition_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    queue_url: Property[str] | None = None

    def client(self, run_context: RunContext) -> SqsClient:
        raise NotImplementedError  # TODO: translate from Java

    def async_client(self, run_context: RunContext) -> SqsAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

    def async_client(self, run_context: RunContext, retry_max_attempts: int) -> SqsAsyncClient:
        raise NotImplementedError  # TODO: translate from Java
