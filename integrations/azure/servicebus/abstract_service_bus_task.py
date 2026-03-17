from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\servicebus\AbstractServiceBusTask.java
# WARNING: Unresolved types: ObjectMapper, ServiceBusClientBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class AbstractServiceBusTask(ABC, AbstractAzureIdentityConnection):
    serde_type: Property[SerdeType] = Property.ofValue(DEFAULT_SERDE_TYPE)
    d_e_f_a_u_l_t__s_e_r_d_e__t_y_p_e: ClassVar[SerdeType] = SerdeType.STRING
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)
    q_u_e_u_e__n_a_m_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = """
        Name of the Service Bus queue to connect to; queueName and topicName are mutually exclusive
        """
    t_o_p_i_c__n_a_m_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = """
        Name of the Service Bus topic to connect to; queueName and topicName are mutually exclusive
        """
    c_o_n_n_e_c_t_i_o_n__s_t_r_i_n_g__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = """
        Connection string for the Service Bus namespace or entity; overrides client credential authentication
        """
    s_u_b_s_c_r_i_p_t_i_o_n__n_a_m_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Subscription name when connecting to a topic"
    s_e_r_d_e__t_y_p_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Serializer/deserializer for the message body; defaults to STRING"
    queue_name: Property[str] | None = None
    topic_name: Property[str] | None = None
    connection_string: Property[str] | None = None
    subscription_name: Property[str] | None = None

    def apply_auth(self, run_context: RunContext, service_bus_client_builder: ServiceBusClientBuilder) -> ServiceBusClientBuilder:
        raise NotImplementedError  # TODO: translate from Java
