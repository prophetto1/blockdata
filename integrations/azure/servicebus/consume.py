from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\servicebus\Consume.java
# WARNING: Unresolved types: Exception, IOException, ServiceBusClientBuilder, ServiceBusReceiveMode, ServiceBusReceivedMessage, ServiceBusReceiverClientBuilder, SubQueue, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from integrations.azure.servicebus.abstract_service_bus_task import AbstractServiceBusTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractServiceBusTask):
    max_receive_duration: Property[timedelta] = Property.ofValue(DEFAULT_MAX_RECEIVE_DURATION)
    pull_batch_size: Property[int] = Property.ofValue(DEFAULT_PULL_BATCH_SIZE)
    d_e_f_a_u_l_t__m_a_x__r_e_c_e_i_v_e__d_u_r_a_t_i_o_n: ClassVar[timedelta] = Duration.ofSeconds(10)
    d_e_f_a_u_l_t__r_e_c_e_i_v_e__m_o_d_e: ClassVar[ServiceBusReceiveMode] = ServiceBusReceiveMode.PEEK_LOCK
    d_e_f_a_u_l_t__p_u_l_l__b_a_t_c_h__s_i_z_e: ClassVar[int] = 100
    r_e_c_e_i_v_e__m_o_d_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Service Bus receive mode; defaults to PEEK_LOCK"
    s_u_b__q_u_e_u_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "SubQueue type to connect to (e.g., DEAD_LETTER_QUEUE)"
    m_a_x__m_e_s_s_a_g_e_s__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Maximum messages to consume before returning; leave empty for no cap"
    m_a_x__r_e_c_e_i_v_e__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = """
        Maximum time to wait for messages before returning; Consume defaults to PT10S and Trigger must provide a value
        """
    receive_mode: Property[ServiceBusReceiveMode] | None = None
    sub_queue: Property[SubQueue] | None = None
    max_messages: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_service_bus_receiver_client_builder(self, run_context: RunContext) -> ServiceBusClientBuilder.ServiceBusReceiverClientBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, total_messages: int, start: datetime, messages_consumed: int, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ended_by_duration(self, start: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ended_by_max_messages(self, max_messages: int, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def write_to_file(self, messages: list[ServiceBusReceivedMessage], run_context: RunContext, serde_type: SerdeType) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        uri: str | None = None
