from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-sentry\src\main\java\io\kestra\plugin\sentry\SentryAlert.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.sentry.abstract_sentry_connection import AbstractSentryConnection
from integrations.notifications.sentry.endpoint_type import EndpointType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SentryAlert(AbstractSentryConnection):
    """Send Sentry alert for failed flow"""
    dsn: str
    s_e_n_t_r_y__v_e_r_s_i_o_n: ClassVar[str] = "7"
    s_e_n_t_r_y__c_l_i_e_n_t: ClassVar[str] = "java"
    s_e_n_t_r_y__d_a_t_a__m_o_d_e_l: ClassVar[str] = "event"
    s_e_n_t_r_y__f_i_l_e__n_a_m_e: ClassVar[str] = "application.log"
    s_e_n_t_r_y__c_o_n_t_e_n_t__t_y_p_e: ClassVar[str] = "application/json"
    s_e_n_t_r_y__d_s_n__r_e_g_e_x_p: ClassVar[str] = "^(https?://[a-f0-9]+@o[0-9]+\\.ingest\\.sentry\\.io/[0-9]+)$"
    p_a_y_l_o_a_d__s_i_z_e__t_h_r_e_s_h_o_l_d: ClassVar[int] = 1024 * 1024
    e_n_v_e_l_o_p__s_i_z_e__t_h_r_e_s_h_o_l_d: ClassVar[int] = 100 * 1024 * 1024
    d_e_f_a_u_l_t__p_a_y_l_o_a_d: ClassVar[str] = """
        {
          "timestamp": "{{ execution.startDate }}",
          "platform": "java",
          "level": "error",
          "message": {
            "message": "Execution {{ execution.id }} failed"
          },
          "extra": {
            "Namespace": "{{ flow.namespace }}",
            "Flow ID": "{{ flow.id }}",
            "Execution ID": "{{ execution.id }}"
          }
        }"""
    endpoint_type: EndpointType = EndpointType.ENVELOPE
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def construct_envelope(self, event_id: str, payload: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_envelope_headers(event_id: str, dsn: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_item_headers(payload_length: int) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def check_envelope_and_payload_thresholds(envelope: str, payload: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
